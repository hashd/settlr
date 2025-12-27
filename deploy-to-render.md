# Deploying Settlr to Render

This guide outlines how to deploy the Settlr monorepo (API + Web) to [Render.com](https://render.com).

## Prerequisites

1.  A [GitHub](https://github.com) repository containing your code.
2.  A [Render](https://render.com) account.

---

## Step 1: Database (PostgreSQL)

1.  Go to your Render Dashboard and click **New +** -> **PostgreSQL**.
2.  **Name**: `settlr-db`
3.  **Region**: Choose closest to you (e.g., Singapore, Frankfurt).
4.  **Plan**: Free (for hobby) or Starter.
5.  Click **Create Database**.
6.  Once created, copy the **Internal DB URL** (starts with `postgres://...`). You will need this for the API service.

---

## Step 2: API Service (Web Service)

1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service:
    - **Name**: `settlr-api`
    - **Region**: Same as Database.
    - **Branch**: `main` (or your working branch).
    - **Root Directory**: `apps/api`
    - **Runtime**: `Node`
    - **Build Command**: `yarn install && yarn build`
      - _Note: This runs `prisma generate && tsc` as configured in package.json._
    - **Start Command**: `yarn start`
4.  **Environment Variables** (Add these):
    - `DATABASE_URL`: Paste the **Internal DB URL** from Step 1.
    - `SUPABASE_JWT_SECRET`: Get this from your Supabase Dashboard (Settings -> API -> JWT Secret). Check if you need to use the value `JWT_SECRET` if the API matches that. (Code supports both `SUPABASE_JWT_SECRET` and `JWT_SECRET`).
    - `SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`). Required for new RS256/JWKS verification.
    - `RESEND_API_KEY`: Your Resend API key (starts with `re_...`).
    - `PORT`: `10000` (Render default, or leave empty and let Render auto-inject).
5.  Click **Create Web Service**.
6.  Wait for deployment. Once live, copy the service URL (e.g., `https://settlr-api.onrender.com`).

---

## Step 3: Web App (Static Site)

1.  Click **New +** -> **Static Site**.
2.  Connect the same GitHub repository.
3.  Configure the service:
    - **Name**: `settlr-web`
    - **Region**: Same as API.
    - **Root Directory**: `apps/web`
    - **Build Command**: `yarn install && yarn build`
    - **Publish Directory**: `dist`
4.  **Environment Variables**:
    - `VITE_API_URL`: Paste the API Service URL from Step 2, appending `/graphql` (e.g., `https://settlr-api.onrender.com/graphql`).
5.  **Rewrites / Redirects** (Important for Vue Router):
    - Go to the **Redirects/Rewrites** tab.
    - Add a new Rewrite Rule:
      - **Source**: `/*`
      - **Destination**: `/index.html`
      - **Action**: Rewrite
6.  Click **Create Static Site**.

---

## Step 4: Final Verification

1.  Visit your Web App URL (e.g., `https://settlr-web.onrender.com`).
2.  Try logging in or signing up.
3.  Create an expense to verify database and API connectivity.

## Troubleshooting

- **Database Usage**: Ensure your IP whitelist allows access if trying to connect externally (Render Internal URL works automatically within Render network).
- **CORS**: If you encounter CORS errors, ensure your API allows the Web domain. (Currently configured to allow general access or needs specific configuration in `apps/api/src/index.ts` if strict).
- **Build Errors**: Check the "Logs" tab in Render for specific error messages.
