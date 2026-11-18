# AutoSocial 🚀
### Intelligent Social Media Automation, Campaign Management & Viral Content Engine

AutoSocial is a full-stack platform designed to automate social media campaigns, track cross-platform creator engagement, and generate high-converting viral content using Retrieval-Augmented Generation (RAG) and Machine Learning.

---

## 🌟 Key Features

### 1. 🤖 Viral LLM & RAG Content Engine
- **RAG-Powered Creative Generation:** Uses `sentence-transformers` and FAISS vector search (`viral_index.faiss`) over historical viral posts to guide the LLM toward proven linguistic hooks and formats.
- **Hook Scoring & Validation:** Pre-publication scoring model evaluates opening lines for engagement, curiosity gaps, and retention probability.
- **Modular Generation Pipeline:** Specialized generation modules for hooks, body captions, targeted hashtags, and calls-to-action (CTA).

### 2. 📱 Multi-Platform Social Media Integration
- **Platform Connectors:** Connects and syncs accounts across **Instagram**, **TikTok**, **YouTube**, and **X (Twitter)**.
- **Automated Bio Verification:** Validates account ownership through dynamic verification tokens placed in user bios.
- **Video & Analytics Ingestion:** Tracks views, likes, comments, and submission logs across connected campaigns.

### 3. 🎯 Promotions & Campaign Management
- **Campaign Creation & Discovery:** Launch influencer marketing campaigns with flexible compensation models (per-million views or pot split).
- **Creator Join Requests & Moderation:** Full approval pipeline allowing brands/admins to accept, review, or moderate creator applications.
- **Live Submission Tracking:** Creators submit published short-form video links for automated metric verification.

### 4. 💬 Real-Time Support & Ticket Chat
- **WebSocket-Powered Chat:** Real-time messaging between creators and campaign managers.
- **Ticket System:** In-app issue resolution with status tracking (open, pending, closed) and image attachments.

### 5. 🔐 Secure Authentication & User Management
- **Dual Auth Flow:** Standard Email/Password registration with 5-digit verification codes sent via SMTP.
- **Google OAuth 2.0:** One-tap sign-in with server-side cryptographic token verification.
- **Session Management:** Encrypted 30-day session cookies managed through Starlette SessionMiddleware.

---

## 🏗️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   AutoSocial Platform                  │
└──────────────────────────────────┬─────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────┐                               ┌──────────────────┐
│ Next.js Frontend │ (Port 3000)                   │ FastAPI Backend  │ (Port 8000)
│ - React 19       │ ◄────── REST API & WS ──────► │ - Python 3.10+   │
│ - TypeScript     │                               │ - Starlette      │
│ - Tailwind CSS   │                               │ - Pydantic       │
└──────────────────┘                               └────────┬─────────┘
                                                            │
         ┌──────────────────────────────────────────────────┼────────────────────────────────┐
         ▼                                                  ▼                                ▼
┌──────────────────┐                               ┌──────────────────┐            ┌──────────────────┐
│ PostgreSQL       │                               │ Viral LLM (RAG)  │            │ Social Platforms │
│ - Users & Auth   │                               │ - FAISS Vector DB│            │ - Instagram      │
│ - Promotions     │                               │ - Sentence-Trans.│            │ - TikTok         │
│ - Submissions    │                               │ - Hook Scorer    │            │ - YouTube        │
│ - Video Stats    │                               │ - Content Gen.   │            │ - Twitter (X)    │
└──────────────────┘                               └──────────────────┘            └──────────────────┘
```

- **Backend Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, High-Performance)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with `psycopg2`
- **Frontend:** [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Vector Search & ML:** [FAISS](https://github.com/facebookresearch/faiss), [Sentence-Transformers](https://sbert.net/), [scikit-learn](https://scikit-learn.org/)
- **Templating (Fallback):** Jinja2 server-rendered templates

---

## 📁 Repository Structure

```
webapp/
├── core/                   # Backend services & database layer
│   ├── config.py           # Database & external API configurations
│   ├── database.py         # DB connection pool, schemas & query logic
│   ├── instagram.py        # Instagram scraper & video ingestion
│   ├── tiktok.py           # TikTok API & scraper utilities
│   ├── twitter.py          # Twitter / X metrics & verification
│   ├── youtube.py          # YouTube Data API integration
│   └── verification.py     # Profile bio verification logic
├── frontend/               # Modern Next.js application
│   ├── app/                # App Router pages (login, signup, promotions, stats)
│   ├── components/         # Reusable UI components & modals
│   ├── context/            # React global context providers
│   ├── lib/                # API helpers & utilities
│   └── package.json        # Frontend dependencies
├── viral_llm/              # AI Content Generation & RAG Engine
│   ├── app.py              # Viral LLM microservice API
│   ├── generation/         # Hooks, captions, hashtags & CTA generators
│   ├── rag/                # FAISS vector database & embedding retrievers
│   │   ├── build_index.py  # Script to rebuild FAISS index from viral dataset
│   │   └── viral_index.faiss # Pre-computed dense vector index
│   └── scoring/            # Hook virality prediction models
├── static/                 # Static assets, CSS, mockups & uploads
├── templates/              # Jinja2 HTML templates
├── main.py                 # Central FastAPI entry point, routes & WebSocket manager
├── req.txt                 # Python backend dependencies
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.x or higher (npm / yarn)
- **PostgreSQL:** Running instance with credentials configured

---

### 1. Database Setup
Create a PostgreSQL database (default name: `discord_bot_db` or custom):
```sql
CREATE DATABASE discord_bot_db;
```
Tables are automatically initialized on startup via `initialize_database()` in `main.py`.

---

### 2. Backend Configuration & Setup

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r req.txt
   ```

3. **Configure database credentials:**
   Update `core/config.py` or set environment variables:
   ```python
   DB_CONFIG = {
       'dbname': 'discord_bot_db',
       'user': 'postgres',
       'password': 'your_password',
       'host': 'localhost',
       'port': '5432'
   }
   ```

4. **Run the FastAPI server:**
   ```bash
   uvicorn main.py:app --reload --host 0.0.0.0 --port 8000
   ```
   API interactive docs will be available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup (Next.js)

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The dashboard will be available at: `http://localhost:3000`

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/signup` | Registers new user and sends verification OTP email |
| `POST` | `/api/login` | Authenticates user credentials and establishes session |
| `POST` | `/api/auth/google` | Validates Google OAuth token and provisions user |
| `GET` | `/api/me` | Returns current authenticated user state |
| `GET` | `/api/promotions` | Lists all active campaigns with optional search/category filters |
| `GET` | `/api/promotions/{id}/detail` | Full detail of a promotion including analytics and tickets |
| `POST` | `/api/accounts/register` | Links a creator social media account |
| `POST` | `/api/promotions/{id}/join` | Submits creator join request for a promotion |
| `POST` | `/api/promotions/{id}/submissions` | Submits short-form video link for verification |
| `WS` | `/ws/{room_id}` | Real-time WebSocket connection for chats and updates |
| `POST` | `/instagram` | Viral LLM generation endpoint (Topic, Audience, Goal) |

---

## 🛡️ Security Best Practices
- Never commit private `.env` or `cred.env` files to version control.
- Ensure all third-party secrets (Google OAuth Client ID, SMTP credentials) are injected via system environment variables in production.
- CORS is restricted to trusted origins (e.g. `http://localhost:3000`).

---

## 📄 License
This project is proprietary and developed for social media automation and marketing workflows.
