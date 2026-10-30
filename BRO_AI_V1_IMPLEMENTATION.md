# BRO AI v1.0.1 — Architecture & Implementation Notes

Status: **security/reliability patch on foundation branch; not merged. Latest backend hardening is awaiting CI verification.**

## Current implementation

BRO AI preserves its Android-friendly single-page frontend and Cloudflare Worker backend.

The frontend currently includes four personas, direct API / official-site handoff modes, browser speech recognition and synthesis, local chat history, local notes, webapp shortcuts, and JSON backup/restore. Chat history, notes, provider settings, Worker URL, and the access token are stored in browser localStorage.

## v1.0.1 security and reliability patch

- Free-first Gemini route, followed by OpenRouter free router.
- Optional Groq route remains disabled unless `GROQ_ENABLE=1`.
- OpenAI, Anthropic, and DeepSeek remain disabled unless `BRO_ALLOW_PAID=1`.
- Provider fallback now covers network errors, HTTP 401, 403, 404, 408, 429, and upstream 5xx responses.
- Each upstream provider request has a 25-second timeout, with a 55-second total deadline for one chat request.
- Upstream provider response bodies are streamed and capped at 1 MiB before JSON parsing.
- The Worker rejects request bodies larger than 64 KB.
- Chat messages are limited to 12,000 characters; system instructions to 7,000 characters; history to 16 messages with a 3,000-character cap per history message.
- A required Cloudflare Rate Limiting binding limits each access token to 20 chat requests per 60 seconds (approximate per Cloudflare location).
- Rate-limit checks use a SHA-256 digest of the Bearer token as the binding key; the raw token is not used as the key.
- The Worker fails closed with HTTP 503 if the rate-limiter binding is absent or unavailable.
- Provider failure responses sent to the browser expose provider name and HTTP status only, not raw upstream diagnostic text.
- CORS allows only configured exact origins. Bearer authentication remains mandatory; CORS is not authentication.
- The UI now displays the actual provider and model returned by the Worker.
- The connection test reads the Worker `providers` health field (rather than the obsolete `configured` field).

## Architecture

```text
Android Chrome / PWA (index.html)
  ├─ Chat UI + persona layer
  ├─ Voice I/O: Web Speech API (turn-based)
  ├─ Local session history + notes + export/import
  └─ HTTPS + Bearer token
       |
       v
Cloudflare Worker (worker.js)
  ├─ Auth + exact-origin CORS
  ├─ Token-scoped rate limiting
  ├─ Bounded JSON body + history validation
  ├─ Persona/provider router
  ├─ Free-first fallback chain + upstream timeout
  └─ Optional paid-provider gate
       |
       +--> Gemini API
       +--> OpenRouter free router
       +--> Optional Groq
       +--> Optional paid OpenAI / Anthropic / DeepSeek
```

## Cloudflare configuration

Use Wrangler CLI **4.36.0 or later** for the Rate Limiting binding syntax. The checked-in `wrangler.toml` configures:

- `BRO_ALLOWED_ORIGIN = "https://sapammeded.github.io"`
- `BRO_CHAT_LIMITER`: 20 requests per 60 seconds per token.
- Free-first model defaults.
- Paid routing disabled by default.

The `namespace_id` in `wrangler.toml` must be a positive integer unique within your Cloudflare account. If `2026103001` is already used by another rate-limit namespace in that account, change it to another unused integer before deployment.

### Worker secrets

Set these as Cloudflare Worker Secrets (not plain text in GitHub):

Required:
- `BRO_ACCESS_TOKEN`: long random private access token.
- `GEMINI_API_KEY`: Google AI Studio API key.

Recommended free fallback:
- `OPENROUTER_API_KEY`.

Optional:
- `GROQ_API_KEY`.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`.

Keep `BRO_ALLOW_PAID=0` unless paid API usage is intentional. Keep `GROQ_ENABLE=0` until the selected model's current price/quota is verified.

### Origin and token security

The configured origin must match the frontend's browser origin exactly, including scheme and host, but not the repository path. For this GitHub Pages site it is `https://sapammeded.github.io`.

CORS only controls browser-origin access. A non-browser client can omit the Origin header, so the Bearer token is the actual authentication control.

The current frontend stores that token in localStorage. This is convenient but means any JavaScript executing on the same origin could potentially read it. GitHub Pages repositories under the same account share the same origin. A dedicated custom domain for BRO AI is recommended before production use. Rotate the token immediately if it may have been exposed; update both the Worker Secret and frontend setting.

### Rate limit behavior

Cloudflare's built-in Workers Rate Limiting API is approximate and applies independently in each Cloudflare location. It is useful as a protective throttle, but it is not a strict global daily/monthly quota or billing cap. It may allow bursts above the configured threshold while counters synchronize. For strict global quotas, a Durable Object-backed limiter would be a later phase.

The binding is intentionally required by the Worker: without it, `/chat` returns HTTP 503 rather than silently running without protection.

## Frontend behavior and provider identity

Persona buttons select the conversation persona/style. They do not guarantee that the same vendor will generate the answer. When paid routing is disabled, the free-first chain may use Gemini or OpenRouter regardless of the selected persona. The frontend now displays the actual `provider` and `model` values returned by the Worker.

The official-site handoff mode remains a manual handoff. It opens the provider's website and copies a prompt; it cannot read the provider website's answer back into BRO AI. ChatGPT URL prefill is unofficial and may change.

## Voice, memory, research, and actions

- Voice remains browser-based turn-taking: speech recognition, API request, then speech synthesis. It is not full-duplex realtime audio.
- Chat history and notes remain device-local in localStorage; they are not cloud-synced.
- Durable cloud memory (D1), research/search integration, realtime voice, and an external action engine are future phases.
- Do not allow a model to run arbitrary code or unrestricted commands. A future action engine must use an allowlist, schema validation, preview, explicit approval, per-tool permissions, audit logs, and idempotency.

## CI and tests

GitHub Actions runs `npm test` for pull requests targeting `main` and pushes to `main`. Workflow permissions are read-only. CI runs the Node test suite and a Wrangler 4.156.0 dry-run bundle/config validation. The test suite covers authentication, origin rejection, CORS preflight, rate-limit enforcement, body size, history validation, paid-provider gating, fallback statuses, sanitized errors, and malformed provider responses.

## Validation checklist before production

1. Inspect and resolve the Cloudflare build failure reported on the earlier commits. The Cloudflare build log was not available during this patch, so its cause is still unknown.
2. Confirm Cloudflare's build environment uses Wrangler 4.156.0 or later and recognizes the `ratelimits` configuration.
3. Confirm `BRO_CHAT_LIMITER` is bound in the deployed Worker.
4. Configure Worker Secrets; never commit or paste secrets into chat.
5. Confirm `BRO_ALLOWED_ORIGIN` matches the exact frontend origin.
6. Call authenticated `GET /health`; verify version `1.0.1`, provider readiness, and `rateLimitConfigured: true`.
7. Test an authenticated Gemini request and OpenRouter fallback.
8. Verify HTTP 401 for invalid token, 403 for disallowed browser origin, 413 for oversized body, and 429 for rate limiting.
9. Verify paid providers are not called while `BRO_ALLOW_PAID=0`.
10. Test speech input/output on the actual Android browser.
11. Verify backup export/import before changing local storage formats.
12. Verify the 1 MiB upstream response cap and 55-second total chat deadline through CI and runtime tests.
13. Do not merge or deploy until Cloudflare build and runtime checks are green.
