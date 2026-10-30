# BRO AI — MASTER PROJECT CONTEXT

> **Purpose:** Single source of truth for any AI collaborator (ChatGPT, Claude, or another assistant) joining this project. Read this file before proposing or changing code.
> **Repository:** https://github.com/sapammeded/bro_ai
> **Active work branch:** `bro-ai-v1.0-foundation`
> **Production/default branch:** `main`
> **Current safety status:** Foundation work is not approved for merge or production deployment.

## 1. Mission

BRO AI is an Android-friendly personal AI assistant interface. The current foundation is a single-page web frontend hosted on GitHub Pages with a Cloudflare Worker backend. The long-term direction is a multi-provider assistant with persistent project/user context, research capabilities, voice interaction, and carefully permissioned tools.

The immediate priority is to make the existing foundation reliable, secure, testable, inexpensive to operate, and easy for the owner to continue from an Android phone.

## 2. Owner collaboration preference

The owner prefers execution over long discussion. Keep communication in concise Indonesian, use direct language, and avoid asking for information already available in this repository or these project notes.

Preferred working loop:
1. Inspect the latest repository state and active branch.
2. Identify one concrete task and its acceptance criteria.
3. Make the smallest safe change.
4. Run relevant tests and inspect the diff.
5. Commit to the active work branch, never directly to `main` unless explicitly authorized.
6. Update `PROJECT_STATUS.md`, `TASK_NEXT.md`, and `CHANGELOG.md` when work materially changes.
7. Report only what changed, test results, commit, and any blocker.

Do not claim work, tests, review, deployment, or merge succeeded unless tool output proves it.

## 3. Current product snapshot

### Frontend
- Single-page `index.html`, designed for Android/mobile use and GitHub Pages.
- Four personas: ChatGPT/Chantika, Claude/Clara, Gemini/Gendis, DeepSeek/Denada.
- Direct API mode and official-site handoff mode.
- Browser Web Speech API recognition and speech synthesis (turn-based).
- Local chat history, notes, settings, Worker URL, and access token in browser localStorage.
- Webapp shortcuts and JSON import/export.
- UI displays the actual provider/model returned by the Worker.

### Backend
- Cloudflare Worker in `worker.js`.
- Provider integrations: Gemini, OpenRouter, optional Groq, optional OpenAI, Anthropic, and DeepSeek.
- Free-first route: Gemini then OpenRouter free router.
- Groq is opt-in via `GROQ_ENABLE=1`.
- Paid OpenAI/Anthropic/DeepSeek routing is opt-in via `BRO_ALLOW_PAID=1`.
- API credentials must be Cloudflare Worker Secrets, never committed to Git.

### Current honest limitations
- No durable cloud memory yet; history and notes are device-local.
- No automatic answer retrieval from official-site handoff pages.
- Voice is turn-based browser speech, not full-duplex realtime voice.
- No production research/search integration or general external action engine yet.
- Built-in Cloudflare rate limiting is approximate per Cloudflare location, not a strict global/daily billing quota.

## 4. Current engineering baseline

The foundation branch contains the v1.0.1 security/reliability work:
- Strict configured browser-origin allowlist and Bearer token authentication.
- Required Cloudflare rate-limit binding; fail closed if missing/unavailable.
- 20 requests per 60 seconds per token (approximate, per Cloudflare location).
- SHA-256 digest of the token used as rate-limit key.
- 64 KB request-body cap; bounded message, system prompt, and history sizes.
- 25-second upstream timeout covering fetch and response parsing.
- Provider fallback for network errors and selected HTTP failures (401/403/404/408/429/5xx).
- Sanitized upstream error details returned to browser.
- Health endpoint reports configured providers and rate-limit readiness.
- Tests and Wrangler dry-run are configured in GitHub Actions.

Read `BRO_AI_V1_IMPLEMENTATION.md` for the detailed architecture, setup, security caveats, and deployment checklist. Read the actual source files for the definitive implementation; documentation never overrides code.

## 5. Repository map

| Path | Purpose |
|---|---|
| `index.html` | Mobile frontend and client-side behavior |
| `worker.js` | Cloudflare Worker API, auth, limits, routing |
| `wrangler.toml` | Worker configuration and rate-limit binding |
| `tests/worker.test.mjs` | Worker tests |
| `test_handoff.js` | Handoff/frontend-related test |
| `.github/workflows/test.yml` | CI test and Wrangler dry-run |
| `README.md` | Setup and high-level project summary |
| `BRO_AI_V1_IMPLEMENTATION.md` | Technical architecture and deployment guide |
| `BRO_AI_MASTER_CONTEXT.md` | This handover document |
| `PROJECT_STATUS.md` | Verified current status |
| `TASK_NEXT.md` | Next task and acceptance criteria |
| `CHANGELOG.md` | Project work history |
| `AI_WORK_RULES.md` | Instructions for AI collaborators |

## 6. Git and release rules

- Work on `bro-ai-v1.0-foundation` unless the owner explicitly chooses another branch.
- The existing PR is https://github.com/sapammeded/bro_ai/pull/1 (foundation branch into main); check its live state before relying on this note.
- Never merge PR #1, push to `main`, or deploy the Worker without explicit owner approval.
- Never force-push or rewrite history unless explicitly authorized.
- Before editing, fetch/read the latest version of the target file and confirm its branch/ref.
- Avoid parallel writes to the same branch; use sequential commits.
- Do not overwrite unrelated changes. Inspect the diff and preserve existing behavior.
- Keep secrets, tokens, private user data, and production credentials out of commits, logs, prompts, and screenshots.

## 7. AI-to-AI handover protocol

At the start of a session, an incoming AI must:
1. Read this file.
2. Read `PROJECT_STATUS.md` and `TASK_NEXT.md`.
3. Inspect latest branch head, PR status, changed files, and CI checks directly on GitHub.
4. Read relevant source and tests before making a code claim.
5. Treat any status in documentation as a snapshot until re-verified.

At the end of a session, the working AI must:
1. Update status and next task based on verified facts.
2. Add a dated entry to `CHANGELOG.md`.
3. Record exact branch and commit SHA.
4. Record tests as PASS, FAIL, NOT RUN, or BLOCKED with evidence.
5. List remaining risks and explicitly state whether anything was deployed or merged.

## 8. Architecture principles for future phases

- Keep the Android-first single-file frontend simple unless a measured need justifies splitting it.
- Prefer free-tier/provider options, but verify current model availability, pricing, and quotas before enabling them.
- Never expose provider API keys in frontend JavaScript.
- Never let model output execute arbitrary shell/code or unrestricted external actions.
- Future tools must use allowlists, strict schemas, explicit user confirmation for consequential actions, least-privilege permissions, audit logs, and idempotency.
- Future cloud memory must have clear user controls, data minimization, export, and deletion behavior.
- Preserve an honest distinction between a persona label and the provider/model that actually generated an answer.

## 9. How the owner gives tasks

The owner may use short instructions such as:
- "Lanjutkan TASK NEXT."
- "Audit keamanan."
- "Perbaiki tes yang gagal."
- "Siapkan handover untuk Claude."

The AI should infer the next action from the verified repository state and these documents. Ask one concise question only if a decision genuinely blocks safe progress.
