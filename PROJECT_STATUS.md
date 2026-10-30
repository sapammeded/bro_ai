# BRO AI — PROJECT STATUS

> Status snapshot created 2026-10-30. Re-check GitHub before acting; this file is a handover aid, not live telemetry.

## Repository
- Repository: https://github.com/sapammeded/bro_ai
- Work branch: `bro-ai-v1.0-foundation`
- Target/default branch: `main`
- Existing PR: https://github.com/sapammeded/bro_ai/pull/1
- PR purpose: v1.0 foundation / free-first multi-provider router.
- Merge/deploy authorization: **NOT GRANTED**.

## Implemented on foundation branch (documented snapshot)
- Free-first Gemini then OpenRouter free routing.
- Optional Groq route disabled by default.
- Optional paid OpenAI, Anthropic, and DeepSeek routes disabled by default.
- Authenticated Worker endpoints with exact-origin CORS policy.
- Required Cloudflare rate-limit binding; fail-closed behavior if unavailable.
- Request body, message, system prompt, and history bounds.
- Upstream request timeout and fallback for selected HTTP/network failures.
- Sanitized provider failure information.
- Frontend provider/model attribution and updated health-check parsing.
- Worker tests and GitHub Actions workflow including Wrangler dry-run.
- README and implementation guide updated.

## Verification state
| Check | Current recorded state | Required action |
|---|---|---|
| Latest GitHub Actions on current branch head | NOT VERIFIED in this handover | Inspect latest commit and workflow runs |
| Node test suite | Configured; latest result NOT VERIFIED | Run CI or `npm test` |
| Wrangler dry-run | Configured; latest result NOT VERIFIED | Inspect CI result and Wrangler output |
| Cloudflare build | Earlier attempts reported failure; exact cause UNKNOWN | Open Cloudflare build log and capture exact error |
| Worker deployment | NOT DEPLOYED by this workflow | Do not deploy without approval |
| PR #1 | Previously draft/open; current state must be checked | Inspect PR status and checks |
| Main branch | Must remain untouched by this handover | Confirm branch refs before release |

## Known engineering caveats
1. Cloudflare built-in rate limiting is approximate per location, not a strict global quota.
2. Frontend currently stores the Worker access token in localStorage; same-origin JavaScript exposure is a risk.
3. GitHub Pages repositories under the same account share the same origin; consider a dedicated custom domain before production.
4. Provider free-tier availability, model names, and quotas can change; verify before deployment.
5. Earlier Cloudflare build failures were visible in status comments, but the root cause was not established. Do not guess.

## Current release gate
Do not merge or deploy until:
- Latest tests pass.
- Wrangler dry-run passes.
- Cloudflare build failure is understood and resolved (if still applicable).
- Secrets and rate-limit namespace are configured correctly.
- Owner explicitly approves release.

## Update discipline
When changing this file, include the date, exact branch head SHA, and links/evidence for CI and Cloudflare build status. Never turn NOT VERIFIED into PASS without evidence.
