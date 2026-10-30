# BRO AI Multi-AI

BRO AI is an Android-friendly personal AI assistant interface with a Cloudflare Worker backend.

## Branch status

- `main`: existing v0.6.1 implementation.
- `bro-ai-v1.0-foundation`: v1.0.1 security and reliability foundation. Not yet deployed or merged.

## What the foundation includes

- Free-first Gemini and OpenRouter routing.
- Optional Groq routing, disabled by default.
- Optional paid OpenAI, Anthropic, and DeepSeek routing, disabled unless `BRO_ALLOW_PAID=1`.
- Provider fallback for network errors, HTTP 401, 403, 404, 408, 429, and upstream 5xx responses.
- Per-provider request timeout (25 seconds).
- Maximum request body of 64 KB, maximum 16 history messages, and bounded message/system lengths.
- Cloudflare token-scoped rate limiting: 20 chat requests per 60 seconds, approximate per Cloudflare location.
- Strict browser-origin allowlist and authenticated `/health` and `/chat` endpoints.
- UI displays the actual provider/model that generated each response.

See [BRO_AI_V1_IMPLEMENTATION.md](./BRO_AI_V1_IMPLEMENTATION.md) for architecture, setup, limitations, and the deployment checklist.

## Setup requirements

The Worker requires these Cloudflare settings before chat requests are accepted:

1. Worker secret `BRO_ACCESS_TOKEN`.
2. At least one provider secret, normally `GEMINI_API_KEY` and optionally `OPENROUTER_API_KEY`.
3. `BRO_ALLOWED_ORIGIN` set to the exact frontend origin.
4. The `BRO_CHAT_LIMITER` rate-limiting binding defined in `wrangler.toml`.
5. Wrangler CLI 4.36.0 or later for the Rate Limiting API configuration.

Do not commit API keys or access tokens to GitHub.

## Honest limitations

- Voice uses Android/browser Web Speech recognition and speech synthesis. It is turn-based, not full-duplex realtime voice.
- Chat history and personal notes are stored locally in the browser. They are not cloud-synced.
- Official-site handoff opens the provider website and copies a prompt. It cannot read that website's answer back into BRO AI automatically.
- ChatGPT's URL prefill is an unofficial convenience and may change.
- A selected persona (ChatGPT, Claude, Gemini, or DeepSeek) is not a guarantee that the named provider generated the answer. With paid routing disabled, the free-first router may use Gemini or OpenRouter. The UI now identifies the actual provider and model.
- Persistent cloud memory, research/search integration, full-duplex realtime voice, and the external action engine are future phases, not delivered features.
- Cloudflare's built-in rate limiter is approximate and local to each Cloudflare location. It is not a strict global quota system.

## Security note

The frontend currently stores its Worker access token in browser `localStorage` for convenience. Anyone who can execute JavaScript on the same origin could potentially read it. GitHub Pages repositories under the same account share the same origin, so a dedicated custom domain for BRO AI is recommended before production use. CORS is a browser access policy, not a substitute for the Bearer token.

## Deployment safety

The foundation branch has not been deployed or merged. Verify the Cloudflare build log and complete the checklist in the implementation guide before enabling production traffic.
