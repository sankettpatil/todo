# Sticky Board - Deployment Guide

This application is a full-stack app with a **Next.js Frontend** and a **FastAPI (Python) Backend**.
Since Netlify is primarily for Frontends, we recommend a "Split Deployment":
1.  **Backend & Database** -> Deployed on **Render** (e.g., render.com)
2.  **Frontend** -> Deployed on **Netlify** (netlify.com)

---

## Part 1: Deploy Backend (Render)

1.  Push your code to **GitHub**.
2.  Create a [Render](https://render.com) account.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Configuration**:
    *   **Root Directory**: `backend`
    *   **Runtime**: Python 3
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
6.  **Environment Variables** (Add these in Render Dashboard):
    *   `ALLOWED_ORIGINS`: `*` (or your Netlify URL once you have it)
    *   `PYTHON_VERSION`: `3.10.0` (Recommended)
    *   *(Optional)* `DATABASE_URL`: If you create a Render Postgres DB, paste the internal connection URL here. If you skip this, it will use a temporary SQLite file (data will vanish on restarts).
7.  Click **Create Web Service**.
8.  **Copy the Backend URL** (e.g., `https://sticky-board-api.onrender.com`). You need this for Part 2.

---

## Part 2: Deploy Frontend (Netlify)

1.  Create a [Netlify](https://netlify.com) account.
2.  Click **Add new site** -> **Import from existing project**.
3.  Connect your GitHub repository.
4.  **Build Settings**:
    *   **Base directory**: `.` (Root) (Leave empty or set to `.`)
    *   **Build command**: `npm run build`
    *   **Publish directory**: `.next` (Netlify usually detects Next.js automatically)
5.  **Environment Variables**:
    *   Click "Add environment variable".
    *   Key: `NEXT_PUBLIC_API_URL`
    *   Value: `https://your-backend-url.onrender.com` (The URL from Part 1, without the trailing slash)
    *   *Note: Next.js reads this at build time (for static) or runtime (for server).*
    *   Key: `NEXTAUTH_URL` -> Your Netlify URL (e.g., `https://my-sticky-site.netlify.app`)
    *   Key: `NEXTAUTH_SECRET` -> A random string (generate one with `openssl rand -base64 32`)
    *   Key: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Your Google Auth credentials (update Google Cloud Console to allow the Netlify domain).
6.  Click **Deploy**.

---

## Part 3: Final Config

1.  Once Netlify deploys, go back to **Render Dashboard**.
2.  Update `ALLOWED_ORIGINS` to your new Netlify URL (e.g., `https://my-sticky-site.netlify.app`) for better security.
3.  Visit your Netlify site. You should be able to create notes!

## ⚠️ Important Note on Database
If you use the default **SQLite** (`sql_app.db`), your notes **will disappear** whenever the backend restarts (which happens frequently on free tiers).
**Recommendation**: Create a "PostgreSQL" database on Render (New + -> PostgreSQL) and copy the `Internal Database URL` into your Backend Service's `DATABASE_URL` environment variable.
