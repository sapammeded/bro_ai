# BRO AI — PROJECT STATUS

> Status snapshot updated 2026-10-30. Re-check GitHub and Cloudflare before acting; this file is a handover aid, not live telemetry.

## Latest verified state
- Work branch: `bro-ai-v1.0-foundation`.
- Latest frontend security commits: `124c653c9d2277b3ad1db2504e2d2e2d4aade586`, `90115d0c62396f4e30bf8a698c7945b39f7d58d9`, `8733372fcd5502a695b7b26fc9e4e888f8207c45`, `346444f8294e8ff2397a033b179458e4c5d28a15`.
- Latest backend hardening commits: `1eb610a9332d16b5250a3060c4c738cdb206f092`, `7da5db5361cd9fe0ba0a9a250e0a6e2e9f24be6d`, `01cd26a1f440920492c177d23729ff167dc7889d`.
- CI run #41 (`41039185403`) completed successfully: all 20 tests passed and dry-run completed, but Wrangler 4.36.0 emitted `Unexpected fields found in top-level field: "previews"`. CI has now been pinned to Wrangler 4.156.0 to match Cloudflare Builds; the new run is pending.
- PR #1: OPEN, DRAFT, not merged; targets `main`.
- PR: https://github.com/sapammeded/bro_ai/pull/1
- Merge/deploy authorization: **NOT GRANTED**.
- Cloudflare failed Preview log for commit `715539f` identified the exact cause: Cloudflare Builds ran `npx wrangler preview`, but `wrangler.toml` had no `[previews]` configuration. Wrangler explicitly requested Preview vars and a Preview rate-limit binding.
- Fixed on the work branch by adding `[previews.vars]` and a separate `[[previews.ratelimits]]` binding with namespace ID `2026103002`; production configuration remains unchanged.
- The user supplied a successful Cloudflare `wrangler deploy` build log for version `7b11e298-dd7b-49a4-953b-5f05ec5d6871`; a separate `wrangler preview` log on an earlier build failed due to the missing `[previews]` block. The Preview configuration was subsequently fixed.
- Latest Preview status for the current backend-hardening head has not yet been checked. CI run #41 passed 20 tests, but its older Wrangler emitted a Preview-config warning; CI now uses 4.156.0 and must be rerun.

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
- Per-provider timeout, 55-second total chat deadline, and streamed 1 MiB upstream response cap (new hardening; CI pending).
- Sanitized provider failure information.
- Frontend provider/model attribution and updated health-check parsing.
- Worker tests and GitHub Actions workflow including Wrangler dry-run.
- Cloudflare Preview configuration now mirrors safe non-secret vars and defines a separate rate-limit namespace.

## Verification state
| Check | State | Evidence / next action |
|---|---|---|
| Cloudflare Preview before fix | FAIL | Build log: missing `previews` block on commit `715539f` |
| Cloudflare Preview after fix | NOT VERIFIED | Check Cloudflare Builds dashboard for newest Preview build; GitHub dry-run is not equivalent |
| GitHub Actions for latest hardening head | PASS for code commit `01cd26a`; rerun pending after Wrangler pin | Run #41 (`41039185403`) |
| Node test suite | PASS: 12 handoff + 7 frontend assertions + 20 Worker tests on `346444f` (#51) | [Run #51](https://github.com/sapammeded/bro_ai/actions/runs/41039898501) |
| Wrangler dry-run | IN PROGRESS / NOT YET VERIFIED | Confirm CI output on latest head |
| Production Worker | No deployment performed by this fix | No deployment authorized |
| PR #1 | OPEN / DRAFT / NOT MERGED | Keep draft until all gates pass |

## Latest audit hardening (2026-10-30)
- CI now pins Wrangler `4.156.0`, matching the version shown in Cloudflare Builds. Earlier CI run #41 used 4.36.0, passed all tests and dry-run but warned that `previews` was an unexpected config field. New CI result is pending.
- `worker.js` now streams provider response bodies and rejects responses larger than 1 MiB before JSON parsing.
- One chat request now has a 55-second total deadline across provider fallback attempts, while each provider attempt remains capped at 25 seconds.
- Health endpoint reports both new limits.
- Added tests for oversized provider responses and total-deadline enforcement.
- Commits: `1eb610a`, `7da5db5`, `01cd26a`.
- CI run #41 was still running when this snapshot was written; do not mark tests passed until the run concludes.

## Frontend security audit (2026-10-30)
- Worker token moved from persistent localStorage to tab-scoped sessionStorage; legacy token is migrated and removed from saved settings at app startup.
- This reduces persistence on shared devices but does not prevent same-origin JavaScript/XSS from reading the token during an active session.
- Existing message rendering escapes HTML before limited Markdown formatting; added static regression assertions for token storage and rendering paths. A full browser-based DOM/XSS test is still outstanding.
- Cloudflare Preview cannot be independently inspected from the available GitHub integration; the latest confirmed CI dry-run is not a substitute.

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
