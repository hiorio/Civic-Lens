# AGENTS.md

## Working Rules

- Use TypeScript across apps and packages.
- Avoid unnecessary `any`. Prefer `unknown`, literal unions, DTOs, and explicit normalization.
- Never commit external API keys, passwords, tokens, or other secrets.
- Split large work into small PR-sized changes.
- Keep source API fields separate from internal domain models. Normalize at the module boundary.
- If the National Assembly API response shape is uncertain, leave a TODO in code and add a verification item in docs.
- Use neutral wording grounded in source data. Do not introduce political judgment, scores, rankings, or persuasive framing.
- Maintain the `ActivityEvent` centered design. Feed, alerts, and member activity views should read from normalized events.
- Keep bill status storage separate from user-facing labels. Internal enum values and display copy must not be conflated.
- When adding a new module or changing a domain boundary, update `docs/architecture.md`.

## Repository Rules

- `apps/web` is the Next.js app.
- `apps/api` is the NestJS API.
- `packages/types` contains shared contracts and literal unions.
- `packages/utils` contains deterministic shared helpers only.
- Shared packages must not import framework code, Prisma clients, HTTP clients, or runtime configuration.
- Local infrastructure lives in `infra/`.

## Verification Checklist

- `pnpm install` succeeds.
- `pnpm lint` succeeds.
- `pnpm build` succeeds.
- `pnpm --filter @civic-lens/web dev` starts the web app.
- `pnpm --filter @civic-lens/api dev` starts the API.
