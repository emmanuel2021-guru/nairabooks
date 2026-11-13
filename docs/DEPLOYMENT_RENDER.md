# Hosting NairaBooks on Render (`DEPLOYMENT_RENDER.md`)

This guide explains how to deploy and host **NairaBooks** on [Render.com](https://render.com), whether you are a developer looking for full infrastructure-as-code or a business owner looking for a quick, 1-click deployment.

---

## 1. Deployment Strategies Overview

NairaBooks supports two deployment models on Render:

| Strategy | Description | Services Created | Best For |
| :--- | :--- | :--- | :--- |
| **Strategy A: 1-Click Blueprint (Recommended)** | Uses the included `render.yaml` to deploy the entire decoupled architecture automatically. | • Next.js Web App (`nairabooks-web`)<br>• Python API (`nairabooks-api`)<br>• PostgreSQL 16 (`nairabooks-db`) | Production, multi-tenant enterprises, and teams wanting dedicated database persistence. |
| **Strategy B: Single Web Service (Free Tier Friendly)** | Deploys only the Next.js application (`web/`), which includes the full embedded Server BFF. | • Next.js Web App (`nairabooks-web`) | Quick demos, staging environments, single-server setups, or 100% free-tier hosting. |

---

## 2. Strategy A: 1-Click Blueprint Deployment (Full Stack)

Render's **Blueprints** read the [`render.yaml`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/render.yaml) file in your repository and automatically provision and wire together all services with zero manual configuration.

### Step 1: Push Your Code to GitHub or GitLab
Make sure your latest codebase is pushed to your remote Git repository:
```bash
git add .
git commit -m "feat(deploy): configure Render blueprint and deployment pipeline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nairabooks.git
git push -u origin main
```

### Step 2: Create a Blueprint on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub or GitLab repository (`nairabooks`).
4. Render will automatically detect `render.yaml` and display the **3 resources** it will create:
   - **`nairabooks-web`** (Next.js 15 Web Service)
   - **`nairabooks-api`** (Python 3.11 Backend Web Service)
   - **`nairabooks-db`** (Managed PostgreSQL 16 Database)
5. Click **Apply**.
6. Render will provision the database, build both services, wire the internal networking (`NAIRABOOKS_API_URL` and `DATABASE_URL`), and assign live HTTPS URLs!

---

## 3. Strategy B: Single Next.js Web Service (Simplest / Free Tier)

Because NairaBooks includes a built-in **Server BFF (Backend-for-Frontend)** within the Next.js application (`web/src/app/api/...`), you can run the entire platform as a single Render Web Service without needing a separate backend container.

### Step-by-Step Instructions:
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure the following service settings:
   - **Name:** `nairabooks-web`
   - **Region:** `Frankfurt (EU Central)` *(closest gateway to Lagos/Nigeria)*
   - **Branch:** `main`
   - **Root Directory:** `web`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** `Free` or `Starter`
4. Expand **Advanced** and add the following Environment Variables:
   - `NODE_ENV`: `production`
   - `NEXT_TELEMETRY_DISABLED`: `1`
   - `PORT`: `10000`
5. Click **Create Web Service**.
6. Render will install dependencies, build the Next.js production bundle, and launch your site at `https://nairabooks-web.onrender.com`.

---

## 4. Environment Variables Reference

| Variable | Service | Default / Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `nairabooks-web` | `production` | Enables Next.js production optimizations. |
| `NEXT_TELEMETRY_DISABLED` | `nairabooks-web` | `1` | Disables telemetry for faster builds and strict privacy. |
| `PORT` | Both | `10000` (Web) / `8000` (API) | Cloud listening port assigned by Render. |
| `NAIRABOOKS_API_URL` | `nairabooks-web` | `http://nairabooks-api:8000` | Internal hostname connecting Next.js to the Python backend. |
| `DATABASE_URL` | `nairabooks-api` | `fromDatabase: nairabooks-db` | Connection string to PostgreSQL 16 with credentials. |
| `SECRET_KEY` | `nairabooks-api` | Auto-generated | 32-byte cryptographically secure session key. |
| `ENVIRONMENT` | `nairabooks-api` | `production` | Switches logging and security guards to production mode. |

---

## 5. Connecting a Custom Domain (e.g. `nairabooks.ng`)

Render provides free, automated **Let's Encrypt SSL/TLS certificates** with automatic renewal.

1. In the Render Dashboard, click your `nairabooks-web` service.
2. Go to **Settings** -> **Custom Domains**.
3. Click **Add Custom Domain** and enter your domain (e.g. `app.yourdomain.ng` or `yourdomain.com`).
4. Update your DNS records with your registrar (e.g. Whogohost, Namecheap, Cloudflare):
   - For a subdomain (`app.yourdomain.ng`): Add a **CNAME** record pointing to `nairabooks-web.onrender.com`.
   - For an apex domain (`yourdomain.com`): Add an **ANAME** or **ALIAS** record pointing to `nairabooks-web.onrender.com` (or the IP address provided by Render).
5. Render will verify the DNS record and automatically issue an HTTPS certificate within a few minutes.

---

## 6. Database Migrations & Seeding (PostgreSQL)

If using Strategy A with managed PostgreSQL:
1. Open the **Shell** tab of `nairabooks-api` in your Render Dashboard.
2. Run database migration preflight:
   ```bash
   uv run python -c "from nairabooks.adapters.migrations import MigrationAdapter; print('DB Ready')"
   ```
3. To inspect tables or run verification scripts:
   ```bash
   uv run python scripts/compliance_check.py
   ```

---

## 7. Render Free Tier Tips & Best Practices

- **Cold Starts:** Free instances on Render spin down after 15 minutes of inactivity and take ~30–50 seconds to wake up on the next request. For production 24/7 responsiveness, upgrade to the **Starter** plan ($7/month).
- **Health Checks:** The blueprint sets `healthCheckPath: /` on the web service and `/health` on the API service to ensure zero-downtime rolling deploys.
- **Continuous Deployment:** Every time you push a commit or merge a pull request to `main`, Render automatically triggers a new build and deploy with zero downtime.
