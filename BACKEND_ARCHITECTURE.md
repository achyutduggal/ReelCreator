# ReelCreator Backend Architecture

## Overview

The backend is a **Python FastAPI** application that powers an automatic marketing reel generator for car videos. It processes uploaded video clips, extracts metadata using AI, generates beat-by-beat scripts, matches clips to script beats via embedding similarity, and triggers video rendering.

### What is a "Beat"?

A **beat** is the fundamental unit of a reel script — a single shot or moment that the reel needs. Think of it as one instruction in a storyboard. When the LLM generates a script from the user's prompt, it breaks the reel into a sequence of beats, each describing:

- **What to show** — e.g., "Wide establishing shot of the car in a dark city environment"
- **How long** — e.g., 2.0 seconds
- **What mood** — e.g., cinematic, dramatic, energetic, elegant

**Example:** For a 10-second reel with the prompt *"A dramatic reveal of a luxury black car"*, the LLM might generate:

| Beat | Description | Duration | Mood |
|---|---|---|---|
| 0 | Wide establishing shot of car in dark city | 2.0s | cinematic |
| 1 | Slow pan across car body highlighting silhouette | 2.0s | dramatic |
| 2 | Close-up of chrome headlights with sharp detail | 2.0s | dramatic |
| 3 | Dynamic low angle shot showing the wheels | 2.0s | energetic |
| 4 | Final wide pull-back revealing full car in dramatic lighting | 2.0s | cinematic |

### Beat-to-Snippet Matching (What We're "Syncing")

Each beat is a **creative intent** — it describes what we *want* to show. Each snippet is a **piece of real footage** — it describes what we actually *have*. The core job of the matching system is to connect these two:

```
Beat (what we want)                    Snippet (what we have)
─────────────────                      ──────────────────────
"Close-up of headlights"    ──match──▶ keyframe_2.jpg: "Tight close-up of chrome
 (duration: 2s, mood: dramatic)         LED headlights with dramatic lighting"
                                        (clip: luxury_reveal.mp4, 4.0s-6.0s)
```

The matching works by:
1. **Embedding both** the beat description and all snippet descriptions into 768-dimensional vectors using `gemini-embedding-001`
2. **Computing cosine similarity** between every beat-snippet pair (matrix multiplication)
3. **Greedy assignment** — each beat gets the highest-scoring snippet that hasn't been taken yet

This is why beats matter — they define the **structure, pacing, and narrative arc** of the reel. Without beats, we'd have random clips stitched together. With beats, the LLM acts as a creative director orchestrating which footage appears when, in what order, to tell a coherent visual story.

The final output is a **sequence**: an ordered list of `(beat → snippet)` assignments, each with a start/end time in the source video, a marketing caption, and a similarity confidence score.

### Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI |
| Video Processing | OpenCV (`cv2`), ffmpeg/ffprobe (CLI) |
| AI Vision | Google Gemini 2.5 Flash (multimodal) |
| Text Embeddings | Google Gemini Embedding (`gemini-embedding-001`) |
| Similarity Matching | NumPy (cosine similarity) |
| Voice-over (TTS) | Edge TTS (`edge-tts`) — Microsoft Edge neural voices, free, no API key |
| Data Storage | Local filesystem + JSON metadata |
| Image Handling | Pillow (PIL) |

### Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│                    Routers (API Layer)                │
│   upload.py    │    generate.py    │    render.py     │
├──────────────────────────────────────────────────────┤
│                   Services (Business Logic)           │
│  metadata.py  │ script_generator.py │ clip_matcher.py │
│               │ voice_generator.py  │ caption_gen.py  │
├──────────────────────────────────────────────────────┤
│                  Storage (Filesystem + JSON)          │
│  storage/uploads/  │  storage/metadata/  │  renders/  │
│                    │  storage/voices/    │            │
└──────────────────────────────────────────────────────┘
```

### Request Pipeline

```
User uploads clips          User enters prompt                     User clicks Export
       │                           │                                      │
  POST /api/upload          POST /api/generate-script              POST /api/render
       │                           │                                      │
  ┌────▼─────┐              ┌──────▼──────┐                        ┌─────▼──────┐
  │ Save file│              │ Gemini LLM  │                        │ Subprocess │
  │ Extract  │              │ generates   │                        │ call to    │
  │ keyframes│              │ beat script │                        │ Remotion   │
  │ Describe │              │ + duration  │                        │ renderer   │
  │ Embed    │              │ enforcement │                        │ (video +   │
  │          │              └──────┬──────┘                        │  audio)    │
  └────┬─────┘                     │                               └────────────┘
       │                    POST /api/match-clips
       │                           │
       │                    ┌──────▼──────┐
       │                    │ Embed beats │
       │                    │ Cosine sim  │
       │                    │ Greedy match│
       │                    │ + Captions  │
       │                    └──────┬──────┘
       │                           │
       │                    POST /api/generate-voice
       │                           │
       │                    ┌──────▼──────┐
       │                    │ Edge TTS    │
       │                    │ Caption →   │
       │                    │ MP3 audio   │
       │                    │ per beat    │
       │                    └─────────────┘
       ▼
  Returns ClipMetadata       Returns Sequence          Returns MP4 URL
                             (with voice_url)           (with audio)
```

---

## Directory Structure

```
backend/
├── main.py                      # FastAPI app, CORS, static mounts, router registration
├── requirements.txt             # Python dependencies
├── .env                         # GEMINI_API_KEY (not committed)
├── .env.example                 # Template for .env
├── routers/
│   ├── __init__.py
│   ├── upload.py                # POST /api/upload
│   ├── generate.py              # POST /api/generate-script, /api/match-clips, /api/generate-voice
│   └── render.py                # POST /api/render
├── services/
│   ├── __init__.py
│   ├── metadata.py              # Keyframe extraction, Gemini Vision, Gemini Embedding
│   ├── script_generator.py      # Beat-by-beat script generation via Gemini LLM
│   ├── clip_matcher.py          # Embedding similarity matching + greedy assignment
│   ├── caption_generator.py     # Marketing caption generation per beat
│   └── voice_generator.py       # Edge TTS voice-over generation per beat
├── models/
│   ├── __init__.py
│   └── schemas.py               # Pydantic request/response models
└── storage/                     # Created at runtime
    ├── uploads/                 # Raw uploaded video files
    ├── metadata/                # Per-clip JSON + keyframe JPEGs
    │   ├── {clip_id}.json
    │   └── {clip_id}/
    │       ├── keyframe_0.jpg
    │       ├── keyframe_1.jpg
    │       └── ...
    ├── voices/                  # Generated TTS MP3 files per beat
    │   ├── voice_beat_0_{clip_id}.mp3
    │   ├── voice_beat_1_{clip_id}.mp3
    │   └── ...
    └── renders/                 # Rendered MP4 output files
```

---

## Data Models — `models/schemas.py`

All request and response types are defined as Pydantic `BaseModel` classes.

### `Snippet`

Represents a 2-second slice of a video clip.

| Field | Type | Description |
|---|---|---|
| `index` | `int` | Snippet position within the clip (0, 1, 2...) |
| `start_sec` | `float` | Start time in seconds within the source video |
| `end_sec` | `float` | End time in seconds within the source video |
| `keyframe_path` | `str` | Absolute filesystem path to the extracted keyframe JPEG |
| `description` | `str` | One-sentence description from Gemini Vision |
| `embedding` | `Optional[List[float]]` | 768-dimensional vector from Gemini Embedding |

### `ClipMetadata`

Represents one uploaded video file and all its extracted metadata.

| Field | Type | Description |
|---|---|---|
| `id` | `str` | 12-character hex UUID (e.g., `5d586bf45c62`) |
| `filename` | `str` | Original uploaded filename |
| `duration` | `float` | Total duration in seconds (from ffprobe) |
| `thumbnail_url` | `str` | URL to first keyframe image, served via static mount |
| `video_url` | `str` | URL to the video file, served via static mount |
| `description` | `str` | Concatenation of all snippet descriptions, joined by ` \| ` |
| `snippets` | `List[Snippet]` | All 2-second snippet metadata for this clip |

### `Beat`

One beat in the LLM-generated reel script.

| Field | Type | Description |
|---|---|---|
| `index` | `int` | Beat position in the reel (0, 1, 2...) |
| `description` | `str` | What type of shot is needed (e.g., "Wide establishing shot of car in dark city") |
| `duration_sec` | `float` | How long this beat should last (1.5-3.0 seconds) |
| `mood` | `str` | One of: cinematic, dramatic, energetic, elegant |

### `SequenceItem`

A matched beat-to-clip assignment — the final output that drives the video render.

| Field | Type | Description |
|---|---|---|
| `beat_index` | `int` | Which beat this fulfills |
| `clip_id` | `str` | ID of the matched source clip |
| `snippet_index` | `int` | Which snippet within the clip |
| `start_sec` | `float` | Start time within the source video |
| `end_sec` | `float` | End time within the source video |
| `caption` | `str` | Marketing caption text (3-8 words) |
| `score` | `float` | Cosine similarity score (0.0-1.0) |
| `video_url` | `str` | URL to the source video file |
| `voice_url` | `str` | URL to the generated TTS MP3 file (empty if no voice) |

### Request/Response Models

| Model | Used By | Fields |
|---|---|---|
| `UploadResponse` | `POST /api/upload` | `clips: List[ClipMetadata]` |
| `GenerateScriptRequest` | `POST /api/generate-script` | `prompt`, `target_duration_sec`, `clips[]` |
| `GenerateScriptResponse` | `POST /api/generate-script` | `beats: List[Beat]` |
| `MatchClipsRequest` | `POST /api/match-clips` | `beats[]`, `clips[]` |
| `MatchClipsResponse` | `POST /api/match-clips` | `sequence: List[SequenceItem]` |
| `RenderRequest` | `POST /api/render` | `sequence[]`, `fps`, `width`, `height` |
| `RenderResponse` | `POST /api/render` | `video_url`, `status` |

---

## Entry Point — `main.py`

### Purpose

Initializes the FastAPI application, configures middleware, sets up static file serving, and registers all routers.

### Key Configuration

```python
app = FastAPI(title="ReelCreator API", version="1.0.0")
```

**CORS Middleware** — Allows the React frontend (running on `localhost:3000` or `localhost:8080`) to make cross-origin requests:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Static File Serving** — Mounts the entire `storage/` directory at `/api/storage/`. This means:
- Uploaded videos are accessible at `/api/storage/uploads/{clip_id}_{filename}`
- Keyframe images at `/api/storage/metadata/{clip_id}/keyframe_{i}.jpg`
- Voice-over MP3s at `/api/storage/voices/voice_beat_{i}_{clip_id}.mp3`
- Rendered outputs at `/api/storage/renders/{render_id}.mp4`

```python
app.mount("/api/storage", StaticFiles(directory="storage"), name="storage")
```

**Directory Creation** — Ensures `storage/uploads/`, `storage/metadata/`, `storage/renders/`, and `storage/voices/` exist on startup.

**Router Registration** — All routers are prefixed with `/api`:

```python
app.include_router(upload.router, prefix="/api")    # POST /api/upload
app.include_router(generate.router, prefix="/api")   # POST /api/generate-script, /api/match-clips
app.include_router(render.router, prefix="/api")     # POST /api/render
```

**Health Check** — `GET /api/health` returns `{"status": "ok"}`.

---

## Service: Metadata Extraction — `services/metadata.py`

This is the most complex service. It handles the full pipeline from raw video file to searchable metadata.

### Function: `get_gemini_client()`

```python
def get_gemini_client():
    return genai.Client(api_key=GEMINI_API_KEY)
```

Factory function that creates a Google Gemini API client using the API key from the `.env` file. Called by every function that needs to interact with Gemini. The key is loaded once at module level via `os.getenv("GEMINI_API_KEY")`.

---

### Function: `get_video_duration(filepath)`

```python
def get_video_duration(filepath: str) -> float
```

**Purpose:** Get the exact duration of a video file in seconds.

**How it works:**
1. Runs `ffprobe` as a subprocess with these flags:
   - `-v quiet` — suppress all output except the requested data
   - `-show_entries format=duration` — only show the duration field
   - `-of csv=p=0` — output as plain CSV with no headers
2. Parses the stdout as a float

**Example:** For a 10.5-second video, `ffprobe` outputs `10.500000` and the function returns `10.5`.

**Why ffprobe instead of OpenCV?** ffprobe reads container metadata directly without decoding frames, making it faster and more accurate. OpenCV's duration calculation (`frame_count / fps`) can be inaccurate for variable frame rate videos.

---

### Function: `extract_keyframes(filepath, clip_id, snippet_duration=2.0)`

```python
def extract_keyframes(filepath: str, clip_id: str, snippet_duration: float = 2.0) -> List[Dict]
```

**Purpose:** Split a video into equal-duration snippets and extract one representative frame from each.

**Parameters:**
- `filepath` — Absolute path to the uploaded video file
- `clip_id` — Unique identifier for this clip (used for storage paths)
- `snippet_duration` — Length of each snippet in seconds (default: 2.0)

**Step-by-step process:**

1. **Get duration** — Calls `get_video_duration()` to know total length
2. **Calculate snippet count** — `num_snippets = max(1, int(duration / 2.0))`
   - A 10-second video → 5 snippets
   - A 3-second video → 1 snippet
   - A 24-second video → 12 snippets
3. **Create output directory** — `storage/metadata/{clip_id}/`
4. **Open video with OpenCV** — `cv2.VideoCapture(filepath)` and get the FPS
5. **For each snippet:**
   - Calculate `start_sec = i * 2.0` and `end_sec = min((i+1) * 2.0, duration)`
   - Calculate `mid_sec = (start_sec + end_sec) / 2` — the midpoint
   - **Seek to the midpoint frame** — `cap.set(cv2.CAP_PROP_POS_FRAMES, int(mid_sec * fps))`
   - **Read the frame** — `cap.read()` returns a BGR numpy array
   - **Save as JPEG** — `cv2.imwrite(keyframe_path, frame)`
   - Append snippet dict with empty `description` and `None` embedding
6. **Release the video capture** — `cap.release()`

**Why the midpoint frame?** The midpoint is the most representative frame of a 2-second window. The first/last frames might be in transition from the previous/next shot.

**Output example** (for a 6-second video):
```python
[
    {"index": 0, "start_sec": 0.0, "end_sec": 2.0, "keyframe_path": "/.../keyframe_0.jpg", "description": "", "embedding": None},
    {"index": 1, "start_sec": 2.0, "end_sec": 4.0, "keyframe_path": "/.../keyframe_1.jpg", "description": "", "embedding": None},
    {"index": 2, "start_sec": 4.0, "end_sec": 6.0, "keyframe_path": "/.../keyframe_2.jpg", "description": "", "embedding": None},
]
```

---

### Function: `describe_keyframes(snippets)`

```python
async def describe_keyframes(snippets: List[Dict]) -> List[Dict]
```

**Purpose:** Use Gemini Vision (multimodal LLM) to generate a text description for each keyframe image.

**Step-by-step process:**

1. Create a Gemini client
2. For each snippet in the list:
   - Open the keyframe JPEG with **PIL** (`Image.open()`)
   - Send it to **Gemini 2.5 Flash** with a vision prompt:
     ```
     "Describe this video frame in one sentence for car marketing.
      Focus on: camera angle, car color, movement, setting, lighting."
     ```
   - The Gemini model receives both the text prompt and the image as `contents`
   - Store the response text as `snippet["description"]`

**Why this prompt?** The description needs to capture the visual attributes that matter for matching against script beats. Camera angle, color, movement, and lighting are the key differentiators between car marketing shots.

**Example outputs:**
- `"Low-angle tracking shot of a matte black sedan emerging from shadow in an urban setting with dramatic side lighting."`
- `"Overhead static shot of the car's roofline and sunroof, centered in frame with soft ambient lighting."`
- `"Close-up of chrome LED headlights with sharp detail and dark background."`

**API call pattern:** One Gemini call per keyframe (sequential, not batched). This is because Gemini Vision requires image data in each request.

---

### Function: `embed_descriptions(snippets)`

```python
async def embed_descriptions(snippets: List[Dict]) -> List[Dict]
```

**Purpose:** Convert text descriptions into 768-dimensional vector embeddings for semantic similarity search.

**Step-by-step process:**

1. Collect all non-empty description strings from the snippets
2. If no descriptions exist, return early (no API call)
3. **Single batch API call** to Gemini Embedding:
   ```python
   response = client.models.embed_content(
       model="gemini-embedding-001",
       contents=descriptions,  # List of strings, all at once
   )
   ```
4. The API returns one `Embedding` object per input string
5. Extract the vector values (`response.embeddings[i].values`) — each is a `List[float]` of length 768
6. Assign each vector back to the corresponding snippet's `embedding` field

**Why `gemini-embedding-001`?**
- Produces 768-dimensional vectors
- Operates in a **unified text embedding space** — both clip descriptions and beat descriptions can be embedded and compared
- Batched API call (all descriptions in one request) is efficient

**Why text embeddings instead of CLIP image embeddings?**

The original design called for `sentence-transformers/clip-ViT-B-32` which:
- Requires PyTorch (~3GB download)
- Directly embeds images into a shared image-text space

Our approach instead:
1. **Image → Text** (Gemini Vision): converts keyframe to a rich text description
2. **Text → Vector** (Gemini Embedding): converts description to a 768-dim vector

This eliminates the PyTorch dependency entirely while achieving the same goal: both beat descriptions and clip descriptions end up as vectors in the same embedding space, enabling cosine similarity comparison.

**Embedding output example:**
```python
snippet["embedding"] = [0.0123, -0.0456, 0.0789, ..., -0.0321]  # 768 floats
```

---

### Function: `process_uploaded_clips(files)`

```python
async def process_uploaded_clips(files) -> List[Dict]
```

**Purpose:** Main orchestrator that runs the full upload-to-metadata pipeline for each file.

**Step-by-step process for each uploaded file:**

1. **Generate ID** — `clip_id = uuid.uuid4().hex[:12]` (e.g., `5d586bf45c62`)
2. **Save to disk** — Read file bytes, write to `storage/uploads/{clip_id}_{filename}`
3. **Get duration** — `get_video_duration(upload_path)`
4. **Extract keyframes** — `extract_keyframes(upload_path, clip_id)` → list of snippet dicts
5. **Describe keyframes** — `describe_keyframes(snippets)` → fills in `description` fields via Gemini Vision
6. **Embed descriptions** — `embed_descriptions(snippets)` → fills in `embedding` fields via Gemini Embedding
7. **Build thumbnail URL** — Uses the first keyframe as the thumbnail, with a relative URL via the static mount
8. **Build overall description** — Joins all snippet descriptions with ` | `
9. **Build video URL** — `/api/storage/uploads/{clip_id}_{filename}`
10. **Save metadata JSON** — Writes everything to `storage/metadata/{clip_id}.json`
11. **Return ClipMetadata** — Pydantic model with all fields populated

**Full pipeline visualization for one file:**
```
video.mp4 (10 seconds)
    │
    ├── ffprobe → duration = 10.0
    │
    ├── OpenCV extract_keyframes (5 snippets @ 2s each)
    │   ├── keyframe_0.jpg (midpoint of 0-2s)
    │   ├── keyframe_1.jpg (midpoint of 2-4s)
    │   ├── keyframe_2.jpg (midpoint of 4-6s)
    │   ├── keyframe_3.jpg (midpoint of 6-8s)
    │   └── keyframe_4.jpg (midpoint of 8-10s)
    │
    ├── Gemini Vision describe_keyframes (5 API calls)
    │   ├── "Low-angle tracking shot of matte black sedan..."
    │   ├── "Side profile pan revealing sleek body lines..."
    │   ├── "Close-up of chrome headlight cluster..."
    │   ├── "Dynamic low shot of 21-inch alloy wheels..."
    │   └── "Wide pull-back revealing full car in city lights..."
    │
    ├── Gemini Embedding embed_descriptions (1 batched API call)
    │   ├── [0.012, -0.034, ...] (768 dims)
    │   ├── [0.045, 0.023, ...]
    │   ├── [-0.011, 0.067, ...]
    │   ├── [0.033, -0.021, ...]
    │   └── [0.008, 0.041, ...]
    │
    └── Save metadata JSON + return ClipMetadata
```

---

## Service: Script Generation — `services/script_generator.py`

### Function: `generate_script(prompt, target_duration_sec, clips)`

```python
async def generate_script(
    prompt: str,
    target_duration_sec: float,
    clips: List[ClipMetadata],
) -> List[Beat]
```

**Purpose:** Given a user's creative direction and available footage, generate a beat-by-beat reel script using an LLM.

**Step-by-step process:**

1. **Build footage context** — Flattens all clips' snippets into a text list:
   ```
   Available footage:
   - Clip 'luxury_reveal.mp4' snippet 0: Low-angle tracking shot of matte black sedan...
   - Clip 'luxury_reveal.mp4' snippet 1: Side profile pan revealing sleek body lines...
   - Clip 'detail_shots.mp4' snippet 0: Close-up of chrome headlight cluster...
   ```

2. **Construct the system prompt** — A structured prompt that tells Gemini to act as a professional video editor:
   ```
   You are a professional video editor creating marketing reels for luxury cars.

   Given a creative direction and available footage, generate a beat-by-beat script
   for a {target_duration_sec}-second reel.

   Available footage:
   {clip_context}

   Rules:
   - Total duration of all beats must equal {target_duration_sec} seconds
   - Each beat should be 1.5-3 seconds
   - Write beats that can be fulfilled by the available footage
   - Each beat needs: description, duration_sec, mood (cinematic/dramatic/energetic/elegant)

   Output ONLY valid JSON array:
   [{"index": 0, "description": "...", "duration_sec": 2.0, "mood": "..."}]
   ```

   **Key design decisions in this prompt:**
   - The available footage is included so the LLM writes **achievable** beats (not hallucinated shots)
   - Duration constraint is emphasized with "MUST equal EXACTLY" wording
   - Beat duration range (2-4s) ensures good pacing for marketing content
   - Mood field is used later for caption tone matching and voice-over tone

3. **Call Gemini 2.5 Flash** — Sends both the system prompt and the user's creative direction:
   ```python
   response = client.models.generate_content(
       model="gemini-2.5-flash",
       contents=[system_prompt, f"Creative direction: {prompt}"],
   )
   ```

4. **Parse the response** — Gemini sometimes wraps JSON in markdown code fences:
   ```python
   text = response.text.strip()
   if text.startswith("```"):
       text = text.split("\n", 1)[1]       # Remove first line (```json)
       text = text.rsplit("```", 1)[0]     # Remove last fence (```)
   beats_data = json.loads(text)
   ```

5. **Duration enforcement** — Even with strong prompting, the LLM sometimes produces beats that don't sum to the exact target duration. A post-processing step **scales all beat durations proportionally** to guarantee the correct total:

   ```python
   total = sum(b.duration_sec for b in beats)
   if abs(total - target_duration_sec) > 0.1:
       scale = target_duration_sec / total
       for b in beats:
           b.duration_sec = round(b.duration_sec * scale, 1)
       # Fix rounding error on the last beat
       remaining = target_duration_sec - sum(b.duration_sec for b in beats[:-1])
       beats[-1].duration_sec = round(remaining, 1)
   ```

   **Example:** If the LLM generates 5 beats summing to 8.0s for a 10.0s target, each beat gets scaled by `10.0 / 8.0 = 1.25x`. A 2.0s beat becomes 2.5s, a 1.5s beat becomes 1.9s, etc. The last beat absorbs any floating-point rounding error.

6. **Return Beat objects** — `[Beat(**b) for b in beats_data]`

**Example input/output:**

Input prompt: `"A dramatic reveal reel of a luxury black car"`

Output:
```json
[
    {"index": 0, "description": "Wide establishing shot of the car in a dark city environment", "duration_sec": 2.0, "mood": "cinematic"},
    {"index": 1, "description": "Slow cinematic pan across the car body highlighting the silhouette", "duration_sec": 2.0, "mood": "dramatic"},
    {"index": 2, "description": "Close-up of chrome headlights with sharp detail", "duration_sec": 2.0, "mood": "dramatic"},
    {"index": 3, "description": "Dynamic low angle shot showing the wheels", "duration_sec": 2.0, "mood": "energetic"},
    {"index": 4, "description": "Final wide pull-back revealing the full car in dramatic lighting", "duration_sec": 2.0, "mood": "cinematic"}
]
```

---

## Service: Clip Matching — `services/clip_matcher.py`

This is the core intelligence of the system — it connects script beats to actual footage using semantic similarity.

### Function: `cosine_similarity(a, b)`

```python
def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float
```

**Purpose:** Compute cosine similarity between two vectors.

**Formula:** `cos(a, b) = dot(a, b) / (||a|| * ||b||)`

- Returns `1.0` when vectors point in the same direction (identical meaning)
- Returns `0.0` when vectors are orthogonal (unrelated meaning)
- Returns `-1.0` when vectors are opposite

Note: This function is defined as a utility but the actual matching uses the vectorized matrix approach below for efficiency.

---

### Function: `embed_texts(texts)`

```python
async def embed_texts(texts: List[str]) -> List[List[float]]
```

**Purpose:** Convert a list of text strings into embedding vectors using Gemini.

**Process:**
1. Creates a Gemini client
2. Calls `client.models.embed_content()` with all texts in a single batch
3. Extracts and returns the `.values` (768-dim float list) from each embedding

This is the same embedding model (`gemini-embedding-001`) used in `metadata.py` for snippet descriptions — which is critical for the matching to work. Both beat descriptions and clip descriptions must be in the **same vector space**.

---

### Function: `match_clips(beats, clips)`

```python
async def match_clips(
    beats: List[Beat],
    clips: List[ClipMetadata],
) -> List[SequenceItem]
```

**Purpose:** For each script beat, find the best matching video snippet using embedding cosine similarity, then generate captions.

**Step 1: Flatten all snippets into a searchable list**

```python
snippet_entries = []
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
```

If you uploaded 3 clips, each 10 seconds (5 snippets each), `snippet_entries` has 15 items.

**Step 2: Embed beat descriptions**

```python
beat_descriptions = [b.description for b in beats]
beat_embeddings = await embed_texts(beat_descriptions)
```

Sends all beat descriptions (e.g., 5 beats) to Gemini Embedding in one batch call. Returns 5 vectors of 768 dimensions each.

**Step 3: Handle missing snippet embeddings**

Defensive code — if any snippet arrived without an embedding (shouldn't happen in normal flow), embed those descriptions now:

```python
snippets_needing_embedding = [
    s["description"] for s in snippet_entries if s["embedding"] is None
]
if snippets_needing_embedding:
    new_embeddings = await embed_texts(snippets_needing_embedding)
    # ... assign back to snippet_entries
```

**Step 4: Build the cosine similarity matrix**

```python
beat_vecs = np.array(beat_embeddings)        # shape: (num_beats, 768)
snippet_vecs = np.array([...embeddings...])  # shape: (num_snippets, 768)
```

**L2 Normalization** — Divide each vector by its magnitude so all vectors have unit length:

```python
beat_norms = np.linalg.norm(beat_vecs, axis=1, keepdims=True)
snippet_norms = np.linalg.norm(snippet_vecs, axis=1, keepdims=True)
beat_vecs_normed = beat_vecs / np.where(beat_norms == 0, 1, beat_norms)
snippet_vecs_normed = snippet_vecs / np.where(snippet_norms == 0, 1, snippet_norms)
```

The `np.where(norms == 0, 1, norms)` prevents division by zero for any zero-magnitude vectors.

**Matrix multiplication** — For normalized vectors, `dot product = cosine similarity`:

```python
similarity_matrix = beat_vecs_normed @ snippet_vecs_normed.T
# shape: (num_beats, num_snippets)
```

**What this matrix looks like** (for 5 beats and 15 snippets):

```
                  snippet_0  snippet_1  snippet_2  ...  snippet_14
beat_0 (wide)       0.82       0.45       0.31     ...    0.67
beat_1 (pan)        0.41       0.88       0.55     ...    0.39
beat_2 (closeup)    0.33       0.52       0.91     ...    0.28
beat_3 (low angle)  0.55       0.38       0.29     ...    0.85
beat_4 (pullback)   0.79       0.41       0.35     ...    0.72
```

Each cell is the semantic similarity between a beat description and a snippet description. Higher = better match.

**Step 5: Greedy assignment**

```python
assigned_snippets = set()
sequence = []

for beat_idx in range(len(beats)):
    scores = similarity_matrix[beat_idx]           # Row of similarities for this beat
    sorted_indices = np.argsort(scores)[::-1]      # Sort snippet indices by descending score

    for snippet_idx in sorted_indices:
        if snippet_idx not in assigned_snippets:   # Skip already-used snippets
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
```

**How greedy assignment works:**

1. For beat 0, find the snippet with the highest similarity score → assign it
2. For beat 1, find the highest-scoring snippet **that hasn't been assigned yet** → assign it
3. Repeat for all beats

**Why greedy instead of optimal (Hungarian algorithm)?**
- For 5-7 beats and 15-30 snippets, greedy produces nearly identical results to optimal
- Much simpler to implement and debug
- The first beat gets the best match, which aligns with the human expectation that early beats should be strong

**Step 6: Generate captions**

```python
sequence = await generate_captions(beats, sequence)
```

Calls the caption generator to add marketing text to each sequence item.

---

## Service: Caption Generation — `services/caption_generator.py`

### Function: `generate_captions(beats, sequence)`

```python
async def generate_captions(
    beats: List[Beat],
    sequence: List[SequenceItem],
) -> List[SequenceItem]
```

**Purpose:** Generate short, punchy marketing captions for each beat in the sequence.

**Step-by-step process:**

1. **Build beat context** — For each matched sequence item, create a description string:
   ```
   Beat 0: Wide establishing shot of car in dark city (mood: cinematic)
   Beat 1: Slow pan across car body highlighting silhouette (mood: dramatic)
   ...
   ```

2. **Single Gemini call** with this prompt:
   ```
   Generate short, punchy marketing captions (3-8 words each) for a luxury car reel.
   Each caption should match the beat's mood and visual.

   Beats:
   {beat_descriptions}

   Output ONLY valid JSON array of strings, one caption per beat:
   ["caption1", "caption2", ...]
   ```

3. **Parse JSON response** — Same fence-stripping logic as script generator

4. **Assign captions** to each `SequenceItem.caption`

**Example output:**
```json
["Darkness Meets Power", "Sculpted in Shadow", "Precision Engineered", "Born to Dominate", "Unmistakably Bold"]
```

---

## Service: Voice Generation — `services/voice_generator.py`

This service generates text-to-speech audio for each beat's caption using **Microsoft Edge TTS** — a free neural voice engine that requires no API key.

### Configuration

```python
VOICE = "en-US-GuyNeural"   # Deep, cinematic male voice for car marketing
RATE = "-10%"                # Slightly slower for dramatic pacing
PITCH = "-5Hz"               # Slightly lower pitch for gravitas
```

**Why these settings?** Car marketing reels benefit from a deeper, slower voiceover that conveys luxury and authority. `en-US-GuyNeural` is one of Edge TTS's highest-quality male voices. The reduced rate and pitch create a cinematic tone that matches the dramatic/elegant moods of the beats.

### Function: `generate_voice_for_sequence(sequence)`

```python
async def generate_voice_for_sequence(
    sequence: List[SequenceItem],
) -> List[SequenceItem]
```

**Purpose:** For each beat in the sequence that has a caption, generate an MP3 voiceover file using Edge TTS.

**Step-by-step process:**

1. **Ensure voice directory exists** — Creates `storage/voices/` if it doesn't exist
2. **For each sequence item:**
   - **Skip if no caption** — Items without captions get no voice
   - **Build filename** — `voice_beat_{beat_index}_{clip_id}.mp3` (deterministic naming for caching)
   - **Check cache** — If the MP3 already exists on disk, skip generation and just set the URL
   - **Generate audio** — Create an `edge_tts.Communicate` object with the caption text, voice, rate, and pitch settings
   - **Save to disk** — `await communicate.save(str(voice_path))` — Edge TTS streams the audio and writes it as MP3
   - **Set URL** — `item.voice_url = "/api/storage/voices/{filename}"` — this URL is served by the FastAPI static mount
3. **Return updated sequence** — Each item now has a `voice_url` pointing to its MP3 file

**Caching behavior:** The deterministic filename means re-generating the same reel won't re-synthesize identical audio. This saves time on iterative edits where only some beats change.

**Example:**

For a sequence item with `beat_index=2`, `clip_id="5d586bf45c62"`, and `caption="Precision Engineered"`:
- Generated file: `storage/voices/voice_beat_2_5d586bf45c62.mp3`
- Returned URL: `/api/storage/voices/voice_beat_2_5d586bf45c62.mp3`
- The frontend Remotion `<Audio>` component fetches this URL and plays it synced to the beat's video

**Edge TTS vs other TTS options:**

| Option | Cost | Quality | API Key? | Latency |
|---|---|---|---|---|
| **Edge TTS** (chosen) | Free | High (neural) | No | ~0.5s per caption |
| Google Cloud TTS | $4/1M chars | High | Yes | ~0.3s |
| OpenAI TTS | $15/1M chars | Very high | Yes | ~1s |
| pyttsx3 (offline) | Free | Low (robotic) | No | ~0.1s |

Edge TTS provides the best quality-to-cost ratio for this use case — neural voice quality with zero cost and no API key setup.

---

## Router: Upload — `routers/upload.py`

### `POST /api/upload`

```python
@router.post("/upload", response_model=UploadResponse)
async def upload_clips(files: List[UploadFile] = File(...)):
    clips = await process_uploaded_clips(files)
    return UploadResponse(clips=clips)
```

- **Input:** `multipart/form-data` with one or more video files in the `files` field
- **Process:** Delegates entirely to `process_uploaded_clips()` in `metadata.py`
- **Output:** `UploadResponse` containing full `ClipMetadata` for each uploaded file

---

## Router: Generate — `routers/generate.py`

### `POST /api/generate-script`

```python
@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script_endpoint(req: GenerateScriptRequest):
    beats = await generate_script(req.prompt, req.target_duration_sec, req.clips)
    return GenerateScriptResponse(beats=beats)
```

- **Input:** `{ prompt, target_duration_sec, clips[] }` — the user's creative direction, target reel length, and all uploaded clip metadata
- **Process:** Calls `generate_script()` in `script_generator.py`
- **Output:** `{ beats[] }` — ordered list of beats with descriptions, durations, and moods

### `POST /api/match-clips`

```python
@router.post("/match-clips", response_model=MatchClipsResponse)
async def match_clips_endpoint(req: MatchClipsRequest):
    sequence = await match_clips(req.beats, req.clips)
    return MatchClipsResponse(sequence=sequence)
```

- **Input:** `{ beats[], clips[] }` — the generated script beats and all clip metadata (with embeddings)
- **Process:** Calls `match_clips()` in `clip_matcher.py`, which also calls `generate_captions()` internally
- **Output:** `{ sequence[] }` — ordered list of matched beat→snippet assignments with captions and scores

### `POST /api/generate-voice`

```python
@router.post("/generate-voice", response_model=MatchClipsResponse)
async def generate_voice_endpoint(sequence: List[SequenceItem]):
    updated = await generate_voice_for_sequence(sequence)
    return MatchClipsResponse(sequence=updated)
```

- **Input:** `List[SequenceItem]` — the matched sequence with captions (from the match-clips step)
- **Process:** Calls `generate_voice_for_sequence()` in `voice_generator.py` — generates an MP3 per beat via Edge TTS
- **Output:** `{ sequence[] }` — same sequence items, now with `voice_url` fields populated pointing to the generated MP3 files

**Note:** This endpoint reuses `MatchClipsResponse` as its response model since the output shape (a list of `SequenceItem`) is identical.

---

## Router: Render — `routers/render.py`

### Helper: `serialize_sequence(sequence)`

```python
def serialize_sequence(sequence):
    result = []
    for s in sequence:
        if hasattr(s, "model_dump"):
            result.append(s.model_dump())    # Pydantic v2
        else:
            result.append(s.dict())          # Pydantic v1
    return result
```

Compatibility shim — converts Pydantic models to dictionaries regardless of Pydantic version.

### `POST /api/render`

```python
@router.post("/render", response_model=RenderResponse)
async def render_reel(req: RenderRequest):
```

- **Input:** `{ sequence[], fps (default 30), width (default 1080), height (default 1920) }`
- **Process:**
  1. Serialize the sequence and generate a deterministic `render_id` from its hash
  2. **Check cache** — if `storage/renders/{render_id}.mp4` exists, return immediately
  3. Build `input_props` JSON with the sequence data, fps, and backend URL
  4. **Spawn subprocess** — calls `node render-server.mjs` with the props, output path, and dimensions
  5. The Node process:
     - Copies source video files to `frontend/public/videos/` (so Remotion can access them locally)
     - Bundles the Remotion React project with webpack
     - Renders each frame via headless Chromium
     - Stitches frames into an MP4 with ffmpeg
  6. If subprocess fails, returns 500 with stderr details
  7. If it times out (>300s), returns 504
- **Output:** `{ video_url, status: "complete" }`

---

## Embedding Architecture — Full Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    UPLOAD PHASE                              │
│                                                             │
│  Video File                                                 │
│      │                                                      │
│      ▼                                                      │
│  OpenCV: Extract keyframe JPEGs (1 per 2-sec snippet)       │
│      │                                                      │
│      ▼                                                      │
│  Gemini Vision (gemini-2.5-flash):                          │
│  Image → Text Description                                   │
│  "Low-angle tracking shot of matte black sedan..."          │
│      │                                                      │
│      ▼                                                      │
│  Gemini Embedding (gemini-embedding-001):                   │
│  Text → 768-dim Vector                                      │
│  [0.012, -0.034, 0.078, ..., -0.032]                       │
│      │                                                      │
│      ▼                                                      │
│  Stored in snippet metadata JSON                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │  (embeddings persist across sessions)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   MATCHING PHASE                             │
│                                                             │
│  Script Beat: "Close-up of headlights"                      │
│      │                                                      │
│      ▼                                                      │
│  Gemini Embedding (gemini-embedding-001):                   │
│  Text → 768-dim Vector                                      │
│  [0.009, -0.041, 0.082, ..., -0.019]                       │
│      │                                                      │
│      ▼                                                      │
│  Cosine Similarity Matrix (NumPy):                          │
│  similarity = beat_vecs_normed @ snippet_vecs_normed.T      │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │ Beat\Snippet  s0    s1    s2    s3  │                    │
│  │ "headlights" 0.33  0.52  0.91  0.28│ ← highest = s2    │
│  │ "wide shot"  0.82  0.45  0.31  0.67│ ← highest = s0    │
│  └─────────────────────────────────────┘                    │
│      │                                                      │
│      ▼                                                      │
│  Greedy Assignment:                                         │
│  Beat 0 → Snippet with highest unassigned score             │
│  Beat 1 → Next highest unassigned                           │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach Works

The key insight is that **Gemini Embedding places semantically similar text close together in vector space**. When we describe a keyframe as "Close-up of chrome LED headlights with dramatic lighting" and a script beat asks for "Close-up of headlights", both texts encode similar concepts and produce vectors with high cosine similarity (~0.9).

This text-based embedding approach has a trade-off compared to direct CLIP image embeddings:
- **Pro:** No PyTorch dependency (saves ~3GB), uses the same Gemini API for everything
- **Pro:** Text descriptions are human-readable and debuggable
- **Con:** Information loss in the image→text conversion step (Gemini Vision may miss subtle visual details)
- **Con:** Two API calls per keyframe (vision + embedding) vs one CLIP inference

For car marketing content where shots are visually distinct (wide shots vs close-ups vs detail shots), the text descriptions capture enough differentiation for accurate matching.

---

## External API Calls Summary

### Gemini API Calls

| Function | Model | Purpose | Call Pattern |
|---|---|---|---|
| `describe_keyframes()` | `gemini-2.5-flash` | Image → text description | 1 call per keyframe (sequential) |
| `embed_descriptions()` | `gemini-embedding-001` | Text → 768-dim vector | 1 batched call per clip |
| `generate_script()` | `gemini-2.5-flash` | User prompt → beat script | 1 call per generation |
| `embed_texts()` | `gemini-embedding-001` | Beat text → 768-dim vector | 1 batched call per matching |
| `generate_captions()` | `gemini-2.5-flash` | Beat context → captions | 1 call per matching |

### Edge TTS Calls

| Function | Voice | Purpose | Call Pattern |
|---|---|---|---|
| `generate_voice_for_sequence()` | `en-US-GuyNeural` | Caption → MP3 audio | 1 call per beat with a caption (sequential, cached) |

### Total calls for a typical workflow (3 clips, 5 snippets each, 5 beats):

| Phase | Calls | Details |
|---|---|---|
| Upload | 18 Gemini | 15 vision + 3 embedding |
| Generate Script | 1 Gemini | 1 script generation |
| Match Clips | 2 Gemini | 1 embedding + 1 caption |
| Generate Voice | 5 Edge TTS | 1 per beat caption |
| **Total** | **21 Gemini + 5 Edge TTS** | **26 total external calls** |
