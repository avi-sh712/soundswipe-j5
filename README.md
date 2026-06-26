# SoundSwipe 🎧

> A full-stack, serverless, machine-learning-powered audio discovery platform — swipe through short copyright-free sounds, save your favorites, and upload your own clips directly to the cloud.

SoundSwipe is a TikTok-style feed for **sound**. Instead of videos, users vertically swipe through short audio assets (foley, UI sounds, impacts, ambient loops, music stings), play them with live waveform visualizations, save the ones they like, and contribute their own recordings. The entire backend runs **serverlessly on AWS** and the frontend is hosted **free on Vercel**.

- **Live App (Frontend):** Hosted on Vercel (Next.js)
- **Live API (Backend):** AWS Lambda Function URL (FastAPI in a container)
- **Region:** `ap-south-1` (Mumbai)

---

## 📑 Table of Contents

1. [Architecture & Workflow Diagram](#-architecture--workflow-diagram)
2. [AWS Technologies — What & How](#-aws-technologies--what--how-they-are-used)
3. [Tech Stack](#-full-tech-stack)
4. [How the Core Flows Work](#-how-the-core-flows-work)
5. [API Reference](#-api-reference)
6. [Local Setup](#-local-setup--installation)
7. [Deployment](#-deployment)
8. [The Business Case — B2C & Scalability](#-the-business-case--b2c--scalability)
9. [Copyright-Free Positioning](#-copyright-free-positioning)
10. [Future Roadmap & Premium Tier](#-future-roadmap--premium-tier)

---

## 🗺️ Architecture & Workflow Diagram

SoundSwipe uses a **fully decoupled architecture**: a static frontend on the edge, a serverless API, and managed AWS data services. The browser talks to S3 *directly* for heavy uploads, so the API never becomes a file-transfer bottleneck.

```
                                  ┌─────────────────────────────────────────────┐
                                  │                  USER (Browser)               │
                                  │     Mobile / Desktop — swipe, play, upload    │
                                  └───────────────┬───────────────┬───────────────┘
                                                  │               │
                          (1) Load feed / save    │               │  (4) Upload file bytes
                              like / get URL       │               │      DIRECTLY to S3
                                                  ▼               ▼
        ┌──────────────────────────────────────────────┐   ┌──────────────────────────────┐
        │            VERCEL (Edge / CDN)                 │   │         AMAZON S3             │
        │  Next.js 14 + React + Tailwind + Zustand       │   │  Bucket: audio assets         │
        │  - Vertical swipe feed (scroll-snap)           │   │  - Stores .mp3 / .wav         │
        │  - WaveSurfer.js live waveforms                │   │  - Serves audio via HTTPS     │
        │  - Saved sounds (client cache + DynamoDB)      │   │  - CORS-locked to app domain  │
        └───────────────────────┬────────────────────────┘   └───────────────▲──────────────┘
                                 │                                            │
        (2) HTTPS /api/* calls   │                                            │ (3) Returns a
            (NEXT_PUBLIC_API_BASE_URL)                                        │  short-lived
                                 ▼                                            │  pre-signed
        ┌──────────────────────────────────────────────┐                     │  POST policy
        │        AWS LAMBDA (Function URL)               │─────────────────────┘
        │  Container image (Docker) on ECR               │
        │  FastAPI + Mangum adapter                      │
        │  - /api/feed/{category}   (read feed)          │
        │  - /api/upload/presigned-url (sign uploads)    │
        │  - /api/upload/confirm    (write metadata)     │
        │  - /api/feed/like/{id}    (save like)          │
        │  - /api/feed/recommendations (ML ranking)      │
        └───────────────┬───────────────────┬────────────┘
                        │                   │
        (5) Read/Write  │                   │  ML similarity (scikit-learn,
            metadata     │                   │  cosine similarity over likes)
                        ▼                   ▼
        ┌──────────────────────────────┐   ┌──────────────────────────────┐
        │      AMAZON DYNAMODB          │   │   RECOMMENDATION ENGINE       │
        │  Single-table design + GSI1   │   │  (in-process, optional)       │
        │  - ASSET#  records (metadata) │   │  - Ranks unseen assets by     │
        │  - USER#   records (likes)    │   │    similarity to liked ones   │
        │  - CATEGORY# index for feeds  │   │  - Fails open (never blocks)  │
        └──────────────────────────────┘   └──────────────────────────────┘
```

### Upload sequence (the clever part)

```
Browser → Lambda:  "I want to upload beep.mp3 (audio/mpeg, category UI)"
Lambda  → S3:      generate_presigned_post(...)   # signs with role's temp creds
Lambda  → Browser: { url, fields:{ key, policy, x-amz-signature, x-amz-security-token, ... } }
Browser → S3:      multipart POST of the raw file using those exact fields   # never touches Lambda
Browser → Lambda:  /api/upload/confirm  → writes the ASSET# row to DynamoDB
Feed    → Lambda:  /api/feed/UI  → new sound now appears for everyone
```

---

## ☁️ AWS Technologies — What & How They Are Used

| AWS Service | Role in SoundSwipe | How it's used (implementation detail) |
|---|---|---|
| **AWS Lambda** | Runs the entire backend API | The FastAPI app is wrapped with **Mangum** (`handler = Mangum(app)`) and deployed as a **container image**. A **Lambda Function URL** (Auth type `NONE`, CORS enabled) exposes it publicly with zero servers to manage. Scales to zero when idle, scales out automatically under load. |
| **Amazon ECR** | Stores the backend container image | The Docker image (Python 3.11 base + FastAPI + scikit-learn) is built and pushed to ECR; Lambda pulls from there. Built on the official `public.ecr.aws/lambda/python:3.11` base image. |
| **Amazon S3** | Object storage for all audio files | Holds every `.mp3`/`.wav`. Uploads use **pre-signed POST policies** so the browser uploads *directly* to S3 — the API only signs the request, it never proxies file bytes. A bucket **CORS policy** restricts who can `POST`/`GET`. Files are organized as `assets/{category}/{uuid}_{filename}`. |
| **Amazon DynamoDB** | NoSQL metadata + interaction store | Uses a **single-table design** with a **Global Secondary Index (`GSI1`)**. `ASSET#` items store audio metadata; `USER#` items store likes; the `CATEGORY#` partition on GSI1 powers instant category feeds via `Query` (no slow scans for category browsing). |
| **IAM Roles (temporary credentials)** | Secure, keyless auth | The Lambda **execution role** provides short-lived credentials (key + secret + **session token**). Boto3 uses the default credential chain so pre-signed uploads automatically include `x-amz-security-token` — no long-lived access keys are baked into the app. |
| **Lambda Function URL + CORS** | Public HTTPS endpoint | Replaces the need for API Gateway for this MVP. The frontend reads it via the `NEXT_PUBLIC_API_BASE_URL` environment variable. |

**Why serverless?** SoundSwipe has spiky, unpredictable traffic (a sound can go viral). Lambda + S3 + DynamoDB all scale automatically and cost **₹0 when idle**, which is ideal for a bootstrapped B2C product on the AWS free tier.

---

## 🧰 Full Tech Stack

**Frontend (hosted free on Vercel)**
- **Next.js 14 (App Router) + React** — UI, routing, server components
- **TypeScript** — type safety
- **Tailwind CSS** — responsive, mobile-first dark "studio" design system
- **Zustand** — lightweight client state (saved sounds, liked IDs, persisted cache)
- **WaveSurfer.js** — real audio waveform rendering & playback
- **MediaRecorder API** — in-browser live microphone recording

**Backend (serverless on AWS)**
- **FastAPI (Python 3.11)** — high-performance async API
- **Mangum** — ASGI ↔ Lambda adapter
- **Boto3** — AWS SDK (S3 pre-signing, DynamoDB access)
- **scikit-learn / NumPy** — cosine-similarity recommendation engine (loaded lazily, fails open)
- **Docker** — container image for Lambda

---

## 🔄 How the Core Flows Work

### 1. Browsing the feed
The home page calls `GET /api/feed/All` (or `/api/feed/{category}`). For a category, Lambda runs a fast **DynamoDB Query** against `GSI1`; for "All" it scans and filters `ASSET#` rows. Each card lazy-renders a **waveform** from the S3 audio URL and snaps into view on scroll (works on both touch and desktop).

### 2. Saving a sound
Tapping the heart stores the **full asset** in Zustand (persisted to `localStorage` so it survives reloads) **and** fires `POST /api/feed/like/{asset_id}` to write a `USER#…/LIKE#…` row in DynamoDB. The **Saved** tab plays back saved sounds with their waveforms.

### 3. Uploading / recording (≤ 30s)
The user picks a file or records live via the mic. The client validates duration (clips over 30s trigger the Pro upsell). Then: request a **pre-signed URL** → upload bytes straight to **S3** → call **`/confirm`** to write metadata to **DynamoDB** → the sound instantly appears in the feed.

### 4. Recommendations (optional ML)
`POST /api/feed/recommendations` takes the user's liked asset IDs and ranks unseen assets by **cosine similarity**. The engine is imported lazily and **fails open** — if scikit-learn isn't available, the API still serves a normal feed instead of crashing.

---

## 📡 API Reference

Base URL: `NEXT_PUBLIC_API_BASE_URL` (your Lambda Function URL)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET`  | `/api/feed/{category}` | Fetch feed for a category (`All` for everything) |
| `POST` | `/api/feed/like/{asset_id}` | Save a like for a user |
| `POST` | `/api/feed/recommendations` | Get ML-ranked recommendations from liked IDs |
| `POST` | `/api/upload/presigned-url` | Get a short-lived S3 upload policy |
| `POST` | `/api/upload/confirm` | Persist uploaded asset metadata to DynamoDB |

---

## 🛠️ Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- An AWS account with an S3 bucket, a DynamoDB table (with `GSI1`), and IAM permissions

### 1. Clone
```bash
git clone https://github.com/avi-sh712/soundswipe-j5.git
cd soundswipe-j5
```

### 2. Frontend
```bash
pnpm install
# create .env.local
echo "NEXT_PUBLIC_API_BASE_URL=https://<your-lambda-url>.lambda-url.ap-south-1.on.aws" > .env.local
pnpm dev
```

### 3. Backend (local)
```bash
pip install -r requirements.txt
# set AWS_REGION, S3_BUCKET_NAME, DYNAMODB_TABLE_NAME and AWS creds in your env
uvicorn api.main:app --reload --port 8000
```

---

## 🚀 Deployment

### Frontend → Vercel (free Hobby tier)
1. Push to GitHub (`main`).
2. Import the repo in Vercel.
3. Add env var **`NEXT_PUBLIC_API_BASE_URL`** = your Lambda URL (Production scope).
4. Deploy. Disable **Deployment Protection** (Settings → Deployment Protection) to make the link public.

### Backend → AWS Lambda (container image)
Build, push to ECR, and update the function (run in AWS CloudShell, region `ap-south-1`):
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=$ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/foleyswipe-api

docker build --platform linux/amd64 -t foleyswipe-api .
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
docker tag foleyswipe-api:latest $REPO:latest
docker push $REPO:latest
aws lambda update-function-code --function-name SoundSwipe-Backend --image-uri $REPO:latest --region ap-south-1
```

> **Note:** The Lambda Function URL must have **Auth type = NONE** and **CORS enabled** so the public frontend can call it. The S3 bucket needs a CORS policy allowing `POST`/`PUT`/`GET` from your domain.

---

## 💼 The Business Case — B2C & Scalability

SoundSwipe is built to sell as a **scalable, direct-to-consumer (B2C) audio platform**.

**Why it scales:**
- **Serverless economics.** Lambda, S3, and DynamoDB scale automatically and cost nothing when idle. Infrastructure cost grows *with* usage rather than ahead of it — perfect for a bootstrapped consumer launch.
- **No backend bottleneck.** Because uploads go **browser → S3 directly**, the API stays light and cheap even as file volume explodes.
- **Edge-delivered frontend.** Vercel's CDN serves the app globally with low latency on mobile and desktop.
- **A data flywheel.** Every swipe, like, and save feeds the recommendation engine, making the feed stickier over time — the classic consumer-app retention loop.

**Who it's for (B2C reach across professions):**
SoundSwipe is for **everyone who makes or needs sound**, not just audio engineers:
- **Content creators & streamers** — grab UI clicks, transitions, and stings.
- **Indie game devs & app developers** — discover foley and interaction sounds.
- **Video editors & filmmakers** — find impacts, ambience, and effects.
- **Musicians & podcasters** — samples, beeps, and textures.
- **Hobbyists & students** — anyone who wants to record a sound on their phone and share it.

Because **anyone can upload** (file or live mic recording in seconds), the catalog grows from the community itself — a low-cost, self-expanding content moat.

---

## 🆓 Copyright-Free Positioning

A core promise of SoundSwipe is a library of **copyright-free, royalty-free sounds and music**:

- **Creator-contributed & cleared.** Uploaders contribute original or copyright-free clips, so consumers can use what they discover **without licensing fear**.
- **Safe for commercial use.** Creators get sounds they can drop into monetized videos, games, and apps without takedowns or strikes.
- **Community-driven catalog.** Short (≤30s) clips keep contribution friction low and encourage a steady flow of fresh, original audio.

> *(Recommended next step: add an explicit upload agreement/attribution model and a moderation queue so the "copyright-free" guarantee is enforced at the point of upload.)*

---

## 🔮 Future Roadmap & Premium Tier

The current build is an **MVP**. Premium is an **idea, not yet implemented** — these are planned, not live:

**Premium subscription (planned — $15/month idea):**
- ⏱️ **Longer uploads** — go beyond the 30-second free cap for full tracks and stems.
- 🎼 **More music & exclusive packs** — a larger, premium catalog of sounds and music.
- ⬇️ **Downloads** — download sounds/music for offline use (free tier is stream-only).
- 💎 **Uncompressed exports & commercial license tiers.**

**Community & social features (planned):**
- 💬 **Comments** — users can comment under each sound and discuss it.
- 👤 **Creator profiles & follows** — build an audience around your uploads.
- ❤️ **Public like counts & trending** — surface what's popular.
- 🗂️ **Collections/playlists** — organize saved sounds into shareable sets.

**Platform hardening (planned):**
- 🔐 **Authentication** (current `user_id` is a placeholder).
- 🛡️ **Upload moderation** to enforce the copyright-free guarantee.
- 🌐 **CloudFront CDN** in front of S3 for faster global audio delivery.

---

## 📁 Project Structure

```
soundswipe-j5/
├── app/                 # Next.js App Router (pages, layout, global styles)
│   ├── page.tsx         # Home — the swipe feed
│   └── upload/          # Upload & live-record page
├── components/          # SwipeFeed, SoundCard, Waveform, UploadForm, ProModal
├── store/               # Zustand store (saved sounds, likes)
├── lib/                 # API client + category constants
├── api/                 # FastAPI backend (Lambda)
│   ├── main.py          # App + Mangum handler
│   ├── routes_feed.py   # Feed, likes, recommendations
│   ├── routes_upload.py # Pre-signed URLs + confirm
│   ├── database.py      # DynamoDB access (single-table)
│   └── recommender.py   # scikit-learn cosine-similarity engine
├── Dockerfile           # Lambda container image
└── requirements.txt     # Python dependencies
```

---

Built with Next.js, FastAPI, and a fully serverless AWS backend.
