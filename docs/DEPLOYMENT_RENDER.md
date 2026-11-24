# Hosting NairaBooks on Render (`DEPLOYMENT_RENDER.md`)

NairaBooks runs as **one Render web service** (the Next.js app in `web/`) plus a **free Neon
Postgres database**. Neither needs a credit card.

The Python package in `src/nairabooks` is a retired reference specification. It is **not** deployed,
and `NAIRABOOKS_API_URL` is no longer used.

---

## 1. Create the database (Neon, free)

1. Sign up at [neon.tech](https://neon.tech) and create a project (any region; Frankfurt matches the Render service).
2. Copy the **connection string**. It looks like
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
3. Nothing else is needed. NairaBooks creates its own table (`nb_documents`) on first start.

Neon's free tier sleeps when idle. The first request after a quiet period takes a second or two longer.

## 2. Deploy the web service (Blueprint)

1. Push the repository to GitHub/GitLab.
2. In Render: **New → Blueprint**, pick the repository. Render reads [`render.yaml`](../render.yaml).
3. When asked for environment values, fill in:

| Variable | Required? | Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** for real use | The Neon connection string from step 1. Without it, data is written to Render's disk and **lost on every deploy or restart**. |
| `NAIRABOOKS_SESSION_SECRET` | **Yes** | Generated automatically by the Blueprint (`generateValue: true`). If set by hand, use at least 32 random characters (`openssl rand -hex 32`). Without it, sign-in is refused (503). |
| `NAIRABOOKS_DEMO_PASSWORD` | Optional | Set it to enable the 5 demo accounts and the "Try a demo role" drawer. Leave it empty for no demo accounts. |

4. Deploy. Health check path is `/`.

## 3. What is stored where

All server state is stored in Postgres as one JSON document per key in `nb_documents`:

| Key | Contents |
| :--- | :--- |
| `auth` | Users (password hashes), workspaces, memberships, audit trail, CAMA certifications |
| `ledger:<workspaceId>` | Chart of accounts, fiscal periods, journal vouchers |
| `tax:<workspaceId>` / `packs:<workspaceId>` | Tax profile / industry pack profile |
| `records:<collection>:<workspaceId>` | Admin records, company settings, Transactions hub records |

Each document is loaded once when the server starts. Every API request waits until its changes are
saved before it responds. If the database is unreachable, the API returns `503` rather than pretending to save.

**Limits:**
- Run **one** instance. Several instances would each keep their own in-memory copy and overwrite each other's saves.
- The relational schema in `db/migrations` is the target design and is not used yet.

## 4. Local development

- `cd web && npm run dev` with no `DATABASE_URL`: data is saved to `web/.data/documents/` (git-ignored).
  Accounts from the old `web/.data/auth-state.json` are imported automatically on first start.
- To use Postgres locally, set `DATABASE_URL` in `web/.env.local`, e.g. your local Postgres 18 or a Neon branch.
- Tests run in memory, and the Postgres code path is tested with PGlite (no database server needed).
