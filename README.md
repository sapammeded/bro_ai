# BRO AI Multi-AI v0.6.1 — Unified Free Chat Handoff

BRO AI is a single interface with two clearly separated modes:

- **Official-site handoff (default for ChatGPT, Claude, DeepSeek):** opens the provider's official website and attempts to copy the prompt. The provider's reply stays on that official site; it does not magically return to BRO AI.
- **Direct API (default for Gemini):** sends messages through the Cloudflare Worker. Provider free-tier availability and limits depend on the provider/account.
- API calls for OpenAI, Anthropic, and DeepSeek are blocked by default in the Worker. Set Worker variable `BRO_ALLOW_PAID=1` only if you intentionally accept possible API charges.

## Deploy
1. Upload the repository files to GitHub Pages.
2. Deploy `worker.js` with `wrangler.toml` to Cloudflare Workers.
3. Set Worker secrets `BRO_ACCESS_TOKEN` and, if using Gemini direct, `GEMINI_API_KEY`.
4. Set `BRO_ALLOWED_ORIGIN` to your GitHub Pages origin.
5. In BRO AI, enter the Worker URL and the access token.
6. Choose **Situs resmi** for free web-account usage where available, or **Langsung (API)** for a configured API.

## Honest limitations
- Opening an official site is a handoff, not an embedded provider chat. BRO AI cannot read that site's answer back automatically.
- ChatGPT's `?q=` prefill is best-effort and not an official API contract; clipboard paste is the fallback.
- A provider's consumer-app free quota is not the same as its API quota.
- Automated tests and a successful Worker health check do not prove a live provider request succeeds.
- Never place provider API keys in public HTML.
