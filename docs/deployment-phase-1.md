# Deployment Phase 1

## Goal

Phase 1 is a public read-only demo. It should prove that Civic Lens can collect National Assembly data, store it in PostgreSQL, and expose the map-first web experience from a public URL.

This is not the full production architecture yet. Authentication, push notifications, mobile apps, Redis, queues, and political scoring are out of scope.

## Recommended Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Web | Vercel Hobby | Good Next.js monorepo support and preview deployments. |
| API | Railway Hobby | Simple long-running NestJS service deployment. |
| Database | Railway PostgreSQL | Keeps the API and DB in one project for the demo phase. |
| Mobile path | Expo later | A future `apps/mobile` can call the same `/v1` API. |
| API version | `/v1` | Keeps web and future mobile clients on a stable API contract. |

## Runtime Shape

```text
civiclens.kr or Vercel URL
  -> apps/web, Next.js
  -> NEXT_PUBLIC_API_BASE_URL=https://<railway-api-domain>/v1

Railway API URL
  -> apps/api, NestJS
  -> PostgreSQL via DATABASE_URL
  -> National Assembly API via NATIONAL_ASSEMBLY_API_KEY
```

## Required Environment Variables

API service:

```env
DATABASE_URL="postgresql://..."
NATIONAL_ASSEMBLY_API_BASE_URL="https://open.assembly.go.kr/portal/openapi"
NATIONAL_ASSEMBLY_AGE="22"
NATIONAL_ASSEMBLY_API_KEY=""
API_PREFIX="v1"
WEB_ORIGIN="https://<vercel-domain>"
PORT=4000
```

Web service:

```env
NEXT_PUBLIC_API_BASE_URL="https://<railway-api-domain>/v1"
```

Do not commit real API keys or database credentials.

## Railway API Settings

Use the repository root as the Railway service root.

Build command:

```bash
corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @civic-lens/api build
```

Start command:

```bash
corepack pnpm --filter @civic-lens/api prisma:migrate:deploy && corepack pnpm --filter @civic-lens/api start
```

The repository includes `railway.json` with these commands.

## Vercel Web Settings

Create a Vercel project for the web app.

Recommended settings:

- Framework: Next.js
- Root directory: repository root
- Install command: `corepack enable && corepack pnpm install --frozen-lockfile`
- Build command: `corepack pnpm --filter @civic-lens/web build`
- Output: Vercel should detect the Next.js output from `apps/web`

If Vercel cannot infer the app in the monorepo, set the project root to `apps/web` and keep the repository available to the build command. Recheck workspace package resolution after changing this setting.

## First Deployment Checklist

1. Create or choose a GitHub repository.
2. Push the current monorepo.
3. Create a Railway project.
4. Add PostgreSQL in Railway.
5. Create a Railway service from the GitHub repository.
6. Add API environment variables in Railway.
7. Deploy the API service.
8. Confirm `https://<railway-api-domain>/v1/health/db`.
9. Create a Vercel project from the same repository.
10. Add `NEXT_PUBLIC_API_BASE_URL=https://<railway-api-domain>/v1`.
11. Deploy the web service.
12. Add the Vercel URL to Railway `WEB_ORIGIN`.
13. Run the first data sync:

```bash
corepack pnpm --filter @civic-lens/api sync:members
corepack pnpm --filter @civic-lens/api sync:bills -- --limit=500
```

The bill sync default is 500 rows and the current safety cap is 1000 rows. For Railway, run these as one-off commands or a temporary deploy command. After the first demo is stable, replace this with a Railway cron job.

## Future Mobile Path

Do not replace Next.js. Add a separate mobile client later:

```text
apps/mobile       Expo + React Native
packages/types    shared contracts
packages/utils    deterministic helpers
packages/api-client, later
```

The mobile app should call the same `/v1` API. Avoid putting domain logic only inside `apps/web`; move reusable API calls and labels into shared packages as they stabilize.
