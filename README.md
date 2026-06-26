# SoundSwipe 🎧 

> A full-stack, machine-learning-powered audio discovery platform built for seamless foley and sound effect curation. 

SoundSwipe operates on a decoupled cloud architecture, allowing users to upload short audio assets to the cloud, swipe through a personalized feed, and receive intelligent recommendations based on their interaction history.

## 🚀 Tech Stack & Architecture

**Frontend (Client Layer)**
* **Next.js & React:** Handles the UI, state management (`zustand`), and audio streaming.
* **Tailwind CSS:** For rapid, responsive, and modern styling.

**Backend (Application & ML Layer)**
* **FastAPI (Python):** High-performance backend routing and AWS orchestration.
* **Scikit-learn:** Powers the custom Recommendation Engine using Cosine Similarity to analyze user "likes" and suggest hyper-relevant audio assets.
* **Boto3:** The AWS SDK for Python, handling all direct cloud interactions.

**Cloud Infrastructure (AWS)**
* **Amazon S3:** Highly scalable object storage for `.mp3` and `.wav` files, utilizing secure Pre-Signed URLs for direct client-to-cloud uploads.
* **Amazon DynamoDB:** A NoSQL database utilizing a highly optimized Single-Table Design (with Global Secondary Indexes) to instantly retrieve audio metadata, categorize feeds, and log user interactions.

---

## ✨ Key Features

* **Direct-to-Cloud Uploads:** Bypasses the backend bottleneck by requesting a temporary AWS signature, allowing the browser to upload heavy audio files directly to S3.
* **Intelligent Feed:** The feed automatically shifts from chronological to personalized as the Scikit-learn engine builds a profile of your swiping habits.
* **Cross-Origin Security (CORS):** Fully locked-down S3 bucket policies ensure only authorized domains can push or pull audio assets.
* **Serverless-Ready:** Designed to easily transition from local development into managed container services (ECS/Render) and edge networks (Vercel).

---

## 🛠️ Local Setup & Installation

### Prerequisites
* Node.js (v18+)
* Python (3.11+)
* An AWS Account with IAM Access Keys

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/SoundSwipe.git](https://github.com/your-username/SoundSwipe.git)
cd SoundSwipe