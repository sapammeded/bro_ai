# BRO AI v1.0 — Architecture & Implementation Notes

Status: **foundation branch**, not yet deployed.

This upgrade preserves the existing single-page Android-friendly interface and Cloudflare Worker backend. It does not replace the project with a new application.

## Current repository audit

The source on `main` had a version mismatch: `worker.js` identified itself as v0.6.1 while the visible footer in `index.html` still said v0.4.0. The frontend already had four personas, a direct-API / official-site handoff switch, browser speech recognition and speech synthesis, local chat history, local notes, webapp shortcuts, and JSON backup/restore.

The existing UI stores chat history, notes, provider settings, the Worker URL, and the access token in browser localStorage. The existing hands-free voice mode is turn-based browser speech recognition + speech synthesis, not a native full-duplex audio model.

## v1.0 foundation included in this branch

- Free-first multi-provider Worker router.
- Gemini API as the first free-tier route when a key is configured.
- OpenRouter's `openrouter/free` route as a second free-first provider.
- Groq is optional and deliberately disabled until `GROQ_ENABLE=1`, because model/account pricing and quota must be checked first.
- OpenAI, Anthropic, and DeepSeek are optional paid routes. They are never called unless `BRO_ALLOW_PAID=1`.
- Fallback to another configured provider on network errors, HTTP 408, HTTP 429, or upstream 5xx responses.
- Protected API keys remain Cloudflare Worker Secrets. No provider key belongs in `index.html`.
- Strict browser-origin allowlist through `BRO_ALLOWED_ORIGIN`.
- Authenticated `/health` endpoint reporting configured providers and current feature boundaries.
- Existing `/chat` request shape remains compatible with the current four persona IDs: `chatgpt`, `claude`, `gemini`, and `deepseek`.

## Target architecture

```text
Android Chrome / PWA (index.html)
  ├─ Chat UI + persona layer
  ├─ Voice I/O: Web Speech API (speech-to-text / text-to-speech)
  ├─ Local session history + notes + export/import
  ├─ Action approval UI (future client tool adapters)
  └─ HTTPS + Bearer token
       |
       v
Cloudflare Worker (worker.js)
  ├─ Auth + CORS + input validation
  ├─ Persona and provider router
  ├─ Free-first fallback chain
  ├─ Optional paid-provider gate
  ├─ Memory API (planned; D1 binding not yet enabled)
  ├─ Research adapter (planned; provider/search credentials required)
  └─ Approval-gated action dispatcher (planned)
       |
       +--> Gemini API free tier
       +--> OpenRouter free model router
       +--> Optional Groq endpoint
       +--> Optional paid OpenAI / Anthropic / DeepSeek
```

## Configure Cloudflare Worker

Deploy the branch's `worker.js` with `wrangler.toml`. Set these Worker secrets:

Required:
- `BRO_ACCESS_TOKEN`: long random private token used by the frontend.
- `GEMINI_API_KEY`: key created in Google AI Studio.

Recommended free fallback:
- `OPENROUTER_API_KEY`: OpenRouter key. Set `OPENROUTER_MODEL` to `openrouter/free` (or retain the value in wrangler.toml).

Optional:
- `GROQ_API_KEY`: only set if you have checked the current model and allowance in your Groq console.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`: optional paid provider keys.
- `BRO_ALLOWED_ORIGIN`: exact comma-separated frontend origins, e.g. `https://sapammeded.github.io`.
- `BRO_ALLOW_PAID`: set to `1` only when you intentionally accept paid API usage. Otherwise keep `0`.
- `GROQ_ENABLE`: set to `1` only after checking whether your selected Groq model is free or paid for your account.

Never commit secrets to GitHub. Never paste a provider key into the public HTML.

### Wrangler variables

The checked-in `wrangler.toml` contains model IDs and safe defaults only. Secrets must be added with Wrangler or the Cloudflare dashboard.

## Frontend connection

Open the GitHub Pages frontend, enter the deployed Worker URL and `BRO_ACCESS_TOKEN` in the connection settings, save, then run **Tes**. A successful authenticated `/health` response should report `version: 1.0.0` and list configured providers.

The current frontend's persona buttons still choose a persona; the Worker now maps those persona IDs onto available model providers. The response metadata identifies the actual provider/model used. The official-site handoff mode remains a manual handoff and does not return the provider's website response into BRO AI.

## Voice: what is and is not implemented

Current voice is free browser-based turn-taking:
1. Android Chrome captures speech with Web Speech recognition.
2. Text is sent to the Worker and selected AI provider.
3. Browser speech synthesis reads the answer aloud.
4. Hands-free mode starts the next listening turn after speech playback.

This is not full-duplex streaming speech-to-speech. Native low-latency audio-to-audio requires a supported realtime audio endpoint and may have account, quota, and billing restrictions. Do not claim realtime voice is active until that integration is configured and tested on the target Android device.

## Memory and privacy

Current chat history and notes remain device-local in localStorage. This means they are not automatically synced between devices and may be lost when browser site data is cleared. A later D1-backed memory layer should add per-user identity, explicit opt-in, retention controls, deletion, and migration from local export. Do not send sensitive credentials, passwords, access tokens, or private personnel data to free-tier model providers. Check each provider's data-use policy; free tiers may use submitted content to improve services.

## Action engine: safety boundary

A language model must not be allowed to run arbitrary code or issue unrestricted commands. The production action engine should use:
- a finite allowlist of named tools;
- JSON-schema validation for every tool argument;
- preview / plan before execution;
- explicit user approval for external writes, sending messages, deleting data, purchases, or deployments;
- per-tool permissions and audit logs;
- idempotency keys and rollback where possible.

Opening a saved webapp and adding a local note are not equivalent to editing a GitHub repository, sending an email, or changing a production database. Those integrations need their own authenticated connectors and explicit permissions.

## Implementation roadmap

1. **Foundation (this branch):** safe free-first provider routing and health reporting.
2. **Memory v1:** Cloudflare D1 migration, user-scoped conversation storage, note search, export and deletion controls.
3. **Voice v1:** retain browser voice as the zero-cost default; add optional realtime audio only behind an explicit provider setting and cost warning.
4. **Research v1:** search adapter with source URLs, timestamps, citations, and provider quota handling.
5. **Action v1:** approval-gated tools, starting with safe local actions, then GitHub and Supabase connectors.
6. **Task runner:** durable job records, progress states, retries, cancellation, and final artifact links.

## Validation checklist before production

- Confirm Cloudflare Worker deployment uses this branch's `worker.js`.
- Configure the Worker secrets and exact allowed origin.
- Confirm `GET /health` with Bearer token returns 200 and version 1.0.0.
- Test one Gemini request.
- Test OpenRouter fallback with Gemini temporarily unavailable or a test key.
- Confirm missing / invalid token returns 401.
- Confirm an unapproved browser origin returns 403.
- Confirm paid providers are not called while `BRO_ALLOW_PAID=0`.
- Test voice input/output on the actual Oppo Android Chrome browser.
- Verify backup export/import before changing local storage formats.
