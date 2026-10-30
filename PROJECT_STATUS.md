# BRO AI — PROJECT STATUS

> Status snapshot updated 2026-10-30. Re-check GitHub and Cloudflare before acting; this file is a handover aid, not live telemetry.

## Latest verified state
- Work branch: `bro-ai-v1.0-foundation`.
- Latest commit after Preview configuration fix: `7b2da16917558354f89a8128e29d950e98d1cfcf`.
- PR #1: OPEN, DRAFT, not merged; targets `main`.
- PR: https://github.com/sapammeded/bro_ai/pull/1
- Merge/deploy authorization: **NOT GRANTED**.
- Cloudflare failed Preview log for commit `715539f` identified the exact cause: Cloudflare Builds ran `npx wrangler preview`, but `wrangler.toml` had no `[previews]` configuration. Wrangler explicitly requested Preview vars and a Preview rate-limit binding.
- Fixed on the work branch by adding `[previews.vars]` and a separate `[[previews.ratelimits]]` binding with namespace ID `2026103002`; production configuration remains unchanged.
- The Preview build after this fix and CI checks for the new head are **PENDING / NOT YET VERIFIED**. Do not claim the fix is validated until Cloudflare and GitHub report results.

## Repository
- Repository: https://github.com/sapammeded/bro_ai
- Work branch: `bro-ai-v1.0-foundation`
- Target/default branch: `main`
- Existing PR: https://github.com/sapammeded/bro_ai/pull/1

## Implemented on foundation branch (source snapshot)
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
- Cloudflare Preview configuration now mirrors safe non-secret vars and defines a separate rate-limit namespace.

## Verification state
| Check | State | Evidence / next action |
|---|---|---|
| Cloudflare Preview before fix | FAIL | Build log: missing `previews` block on commit `715539f` |
| Cloudflare Preview after fix | PENDING | Check newest build for head `7b2da16` |
| GitHub Actions for `7b2da16` | NOT YET RETURNED | Inspect workflow run and job output |
| Node test suite | NOT VERIFIED for latest head | Confirm CI `npm test` |
| Wrangler dry-run | NOT VERIFIED for latest head | Confirm CI output |
| Production Worker | No deployment performed by this fix | No deployment authorized |
| PR #1 | OPEN / DRAFT / NOT MERGED | Keep draft until all gates pass |

## Known engineering caveats
1. Cloudflare built-in rate limiting is approximate per location, not a strict global quota.
2. Frontend currently stores the Worker access token in localStorage; same-origin JavaScript exposure is a risk.
3. GitHub Pages repositories under the same account share the same origin; consider a dedicated custom domain before production.
4. Provider free-tier availability, model names, and quotas can change; verify before deployment.
5. Preview rate-limit namespace ID `2026103002` is intended to be distinct from production ID `2026103001`; confirm it is unused in this Cloudflare account if Wrangler reports a namespace conflict.

## Release gate
Do not merge or deploy until:
- Latest tests pass.
- Wrangler dry-run passes.
- Cloudflare Preview build succeeds.
- Secrets and rate-limit namespaces are configured correctly.
- Owner explicitly approves release.
