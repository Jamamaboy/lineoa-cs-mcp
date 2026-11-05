# dev log

## 2026-11-05 22:00 ICT · Lane created (bootstrapped by the plan lane)
- What: empty STATUS/LOG created as part of the lane rules in CLAUDE.md. From now on, only the dev lane writes here.
- For other lanes: none.

## 2026-11-06 02:50 ICT · Stage 1: scaffold
- What: package.json (ESM, scripts: build/dev/mock/test/typecheck/lint/check), tsconfig (strict, NodeNext),
  biome.json, vitest.config.ts, .gitignore (env, HAR, ASSIGNMENT), .env.example, CI workflow, a smoke test.
  Deps: @modelcontextprotocol/sdk ~1.32.2 (pinned minor; whatsapp-mcp broke on an unpinned major), zod 4, hono +
  @hono/node-server (mock). Dev: typescript ~5.9, vitest 5, biome 2.6, tsx. Installed with --ignore-scripts.
- Why: PLAN §3 and §8 stage 1. The user wants feature-by-feature commits with a check after each.
- Commits: `chore: scaffold TypeScript project with Biome, Vitest and CI`.
- For other lanes: none.

## 2026-11-06 03:00 ICT · Mock chat.line.biz
- What: `mock-server/` (Hono). `fixtures.ts` builds in-memory state from `test/research/line-api-shapes`. `app.ts`
  copies the real paths (`/api/v1/me`, `/api/v1/bots`, `/api/v2/bots/{botId}/chats`, `/api/v1/bots/{botId}/chats/{chatId}`,
  `/api/v3/.../messages`), the `__Host-chat-ses` cookie, the 401 `{code:"not_login"}` body, and the cursors (`next` for
  chats, `backward` for history, both opaque). A mock login form issues a session. `main.ts` binds 127.0.0.1 only.
  Checked by hand with curl: 401 without a cookie, the bot list with one.
- Why: stage 2. The real client can point at this mock unchanged, so "works on mock" stays close to "works on real".
- Commits: `feat(mock): serve a fake chat.line.biz from the research fixtures`.
- For other lanes: the cookie is Secure (Hono enforces the `__Host-` rule); browsers accept it on 127.0.0.1.
