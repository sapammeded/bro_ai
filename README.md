# BRO AI Multi-AI

BRO AI is an Android-friendly personal AI assistant interface with a Cloudflare Worker backend.

## Versions

- `main`: existing v0.6.1 implementation.
- `bro-ai-v1.0-foundation`: free-first multi-provider Worker foundation. Not yet deployed.

## v1.0 foundation

The Worker supports Gemini free-tier routing and OpenRouter's free model router, with optional Groq and paid providers. Paid OpenAI, Anthropic, and DeepSeek routes are disabled unless `BRO_ALLOW_PAID=1`. Provider API keys stay in Cloudflare Worker Secrets.

See [BRO_AI_V1_IMPLEMENTATION.md](./BRO_AI_V1_IMPLEMENTATION.md) for architecture, configuration, limitations, and the deployment checklist.

## Important

The current frontend voice feature uses browser speech recognition and speech synthesis. It is turn-based voice interaction, not full-duplex realtime audio. Current chat history and notes are device-local. The action engine, durable cloud memory, and research integrations remain planned phases; this release must not be described as already able to execute arbitrary tasks.

Do not commit API keys or access tokens to this repository.
