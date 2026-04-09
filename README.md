# ReelCreator

Automatic marketing reel generator and captioner for car videos. Upload clips, provide a creative prompt, and the system generates a captioned reel by extracting metadata, generating a script, matching footage to script beats, and rendering the final video.

## How It Works

### The Pipeline

```
Upload Clips → Extract Metadata → Generate Script → Match Clips → Render Reel
```

1. **Upload** — User uploads car video clips (cinematics, configurator shots, static shots)
2. **Metadata Extraction** — Each clip is split into 2-second snippets. Keyframes are extracted via OpenCV, described by Gemini Vision, and embedded into 768-dim vectors
3. **Script Generation** — User enters a creative prompt (e.g., *"A dramatic reveal reel of a luxury black car"*). Gemini LLM generates a beat-by-beat script
4. **Clip Matching** — Each script beat is matched to the best video snippet using cosine similarity between embeddings
5. **Caption Generation** — Short marketing captions are generated for each beat
6. **Preview & Render** — Remotion Player shows an in-browser preview; Export renders a final MP4

### What is a "Beat"?

A **beat** is the fundamental unit of the reel script — a single shot or moment that defines what the reel should show at a given point. Think of it as one instruction in a storyboard.

When the LLM generates a script from the user's prompt, it breaks the reel into a sequence of beats:

| Beat | Description | Duration | Mood |
|---|---|---|---|
| 0 | Wide establishing shot of car in dark city | 2.0s | cinematic |
| 1 | Slow pan across car body highlighting silhouette | 2.0s | dramatic |
| 2 | Close-up of chrome headlights with sharp detail | 2.0s | dramatic |
| 3 | Dynamic low angle shot showing the wheels | 2.0s | energetic |
| 4 | Final wide pull-back revealing full car in dramatic lighting | 2.0s | cinematic |

Each beat has:
- **Description** — What shot/visual is needed
- **Duration** — How long it should last (1.5-3 seconds)
- **Mood** — The emotional tone (cinematic / dramatic / energetic / elegant)

### Beat-to-Snippet Matching

Each beat is a **creative intent** (what we want to show). Each snippet is **real footage** (what we have). The matching system connects the two:

```
Beat (intent)                          Snippet (footage)
─────────────                          ─────────────────
"Close-up of headlights"    ──match──▶ "Tight close-up of chrome LED
 duration: 2s, mood: dramatic           headlights with dramatic lighting"
                                        clip: luxury_reveal.mp4, 4.0s-6.0s
```

The matching process:
1. Both the beat description and all snippet descriptions are converted into **768-dimensional vectors** using Gemini's `gemini-embedding-001` model
2. **Cosine similarity** is computed between every beat-snippet pair (a matrix multiplication)
3. **Greedy assignment** — each beat gets the highest-scoring snippet that hasn't been used yet

This gives the reel a coherent narrative arc rather than random clip ordering. The beats define the **structure and pacing**, while the matching ensures the right footage appears at the right moment.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                Frontend (React + Remotion + Tailwind)      │
│  UploadPanel → PromptInput → ReelPreview → TimelineEditor │
└────────┬──────────┬──────────────┬────────────────────────┘
         │          │              │
    POST /upload  POST /generate  POST /render
         │          │              │
┌────────▼──────────▼──────────────▼────────────────────────┐
│                  Backend (Python + FastAPI)                 │
│                                                            │
│  metadata.py         script_generator.py    render.py      │
│  ┌─────────────┐     ┌────────────────┐     ┌──────────┐  │
│  │ OpenCV      │     │ Gemini LLM     │     │ Remotion │  │
│  │ Gemini      │     │ beat script    │     │ render   │  │
│  │ Vision →    │     │                │     │ server   │  │
│  │ Gemini      │     │ clip_matcher   │     │ (Node)   │  │
│  │ Embedding   │     │ cosine sim     │     │          │  │
│  └─────────────┘     │ + captions     │     └──────────┘  │
│                      └────────────────┘                    │
└────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Remotion 4, TailwindCSS |
| Backend | Python 3.9+, FastAPI, OpenCV, NumPy |
| AI | Google Gemini 2.5 Flash (vision + LLM), Gemini Embedding (`gemini-embedding-001`) |
| Video Render | Remotion (React-based programmatic video), ffmpeg |
| Storage | Local filesystem + JSON metadata |

## Project Structure

```
ReelCreator/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, static file serving
│   ├── requirements.txt
│   ├── .env                       # GEMINI_API_KEY (not committed)
│   ├── routers/
│   │   ├── upload.py              # POST /api/upload
│   │   ├── generate.py            # POST /api/generate-script, POST /api/match-clips
│   │   └── render.py              # POST /api/render
│   ├── services/
│   │   ├── metadata.py            # Keyframe extraction, Gemini Vision, embeddings
│   │   ├── script_generator.py    # Beat-by-beat script generation
│   │   ├── clip_matcher.py        # Embedding similarity + greedy assignment
│   │   └── caption_generator.py   # Marketing caption generation
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   └── storage/                   # Runtime data (not committed)
│       ├── uploads/               # Raw video files
│       ├── metadata/              # JSON + keyframe JPEGs
│       └── renders/               # Rendered MP4s
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main layout
│   │   ├── components/            # UploadPanel, PromptInput, ReelPreview, TimelineEditor
│   │   ├── remotion/              # ReelComposition, ClipSequence, CaptionOverlay
│   │   ├── api/client.ts          # Typed API wrappers
│   │   └── types/reel.ts          # TypeScript interfaces
│   ├── render-server.mjs          # Node script for MP4 export via Remotion
│   └── webpack.config.js
├── BACKEND_ARCHITECTURE.md        # Detailed backend documentation
├── start.sh                       # Setup script
└── .gitignore
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload video files, extract metadata + embeddings |
| `/api/generate-script` | POST | Generate beat-by-beat script from prompt |
| `/api/match-clips` | POST | Match beats to clips via embedding similarity |
| `/api/render` | POST | Render final MP4 via Remotion |
| `/api/health` | GET | Health check |

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- ffmpeg (`brew install ffmpeg` on macOS)
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone and enter project
cd ReelCreator

# Backend
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
pip3 install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Running

```bash
# Terminal 1 — Backend (port 8000)
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open http://localhost:3000

### Usage

1. **Upload clips** — Drag and drop car video files into the upload panel
2. **Enter a prompt** — e.g., *"A dramatic reveal reel of a luxury black car"*
3. **Select duration** — 5s, 10s, 15s, or 30s
4. **Click Generate Reel** — The system generates a script, matches clips, and shows a preview
5. **Reorder beats** — Use the timeline editor to adjust clip order
6. **Export** — Click "Export MP4" to render the final video

## Embedding Flow

```
Video Upload
    │
    ▼
Extract keyframe JPEGs (OpenCV, 1 per 2-sec snippet)
    │
    ▼
Gemini Vision: image → text description
    │
    ▼
Gemini Embedding: text → 768-dim vector (batched)
    │
    ▼
Stored in metadata JSON
    
─── later, during generation ───

Script beats (text) → Gemini Embedding → 768-dim vectors
    │
    ▼
Cosine similarity matrix (NumPy): beats × snippets
    │
    ▼
Greedy assignment: best unassigned snippet per beat
    │
    ▼
Caption generation → Final sequence → Remotion render
```

Both clip descriptions (from Gemini Vision) and beat descriptions (from script generation) are embedded into the **same vector space** using `gemini-embedding-001`. This allows cosine similarity to measure how well a piece of footage matches a script beat's intent.
