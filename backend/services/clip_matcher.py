import os
from typing import List

import numpy as np
from google import genai
from models.schemas import Beat, ClipMetadata, SequenceItem
from services.caption_generator import generate_captions

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


async def embed_texts(texts: List[str]) -> List[List[float]]:
    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=texts,
    )
    return [e.values for e in response.embeddings]


async def match_clips(
    beats: List[Beat],
    clips: List[ClipMetadata],
) -> List[SequenceItem]:
    # Collect all snippet info
    snippet_entries = []
    clip_video_urls = {clip.id: clip.video_url for clip in clips}
    for clip in clips:
        for snippet in clip.snippets:
            snippet_entries.append({
                "clip_id": clip.id,
                "snippet_index": snippet.index,
                "start_sec": snippet.start_sec,
                "end_sec": snippet.end_sec,
                "description": snippet.description,
                "embedding": snippet.embedding,
                "video_url": clip.video_url,
            })

    # Embed beat descriptions
    beat_descriptions = [b.description for b in beats]
    beat_embeddings = await embed_texts(beat_descriptions)

    # For snippets without embeddings, embed their descriptions
    snippets_needing_embedding = [
        s["description"] for s in snippet_entries if s["embedding"] is None
    ]
    if snippets_needing_embedding:
        new_embeddings = await embed_texts(snippets_needing_embedding)
        idx = 0
        for s in snippet_entries:
            if s["embedding"] is None:
                s["embedding"] = new_embeddings[idx]
                idx += 1

    # Build similarity matrix
    beat_vecs = np.array(beat_embeddings)
    snippet_vecs = np.array([s["embedding"] for s in snippet_entries])

    # Normalize
    beat_norms = np.linalg.norm(beat_vecs, axis=1, keepdims=True)
    snippet_norms = np.linalg.norm(snippet_vecs, axis=1, keepdims=True)
    beat_vecs_normed = beat_vecs / np.where(beat_norms == 0, 1, beat_norms)
    snippet_vecs_normed = snippet_vecs / np.where(snippet_norms == 0, 1, snippet_norms)

    similarity_matrix = beat_vecs_normed @ snippet_vecs_normed.T

    # Greedy assignment: for each beat, pick highest-scoring unassigned snippet
    assigned_snippets = set()
    sequence = []

    for beat_idx in range(len(beats)):
        scores = similarity_matrix[beat_idx]
        sorted_indices = np.argsort(scores)[::-1]

        for snippet_idx in sorted_indices:
            if snippet_idx not in assigned_snippets:
                assigned_snippets.add(snippet_idx)
                entry = snippet_entries[snippet_idx]
                sequence.append(SequenceItem(
                    beat_index=beat_idx,
                    clip_id=entry["clip_id"],
                    snippet_index=entry["snippet_index"],
                    start_sec=entry["start_sec"],
                    end_sec=entry["end_sec"],
                    caption="",
                    score=float(scores[snippet_idx]),
                    video_url=entry["video_url"],
                ))
                break

    # Generate captions for matched beats
    sequence = await generate_captions(beats, sequence)

    return sequence
