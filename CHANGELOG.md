# BRO AI — CHANGELOG

## 2026-10-30 — Align CI Wrangler with Cloudflare Builds
- CI previously used Wrangler 4.36.0; its dry-run passed but warned that the `previews` field was unexpected.
- Updated CI to Wrangler 4.156.0, matching the version reported in Cloudflare Builds, so Preview config validation is meaningful.
- New workflow run is pending; no merge or production deployment performed.


## 2026-10-30 — Backend response and timeout hardening
- Added streamed upstream response reading with a 1 MiB maximum before JSON parsing.
- Added a 55-second total chat deadline across provider fallback attempts; individual provider attempts remain capped at 25 seconds.
- Health endpoint now reports both limits.
- Added regression tests for oversized upstream responses and deadline expiry.
- Commits: `1eb610a`, `7da5db5`, `01cd26a`.
- GitHub Actions run #41 was in progress at the time of this update; test success is not yet claimed.
- No merge to `main` and no production deployment performed.


This log records meaningful project and handover changes. Source commits remain the authoritative code history.

## 2026-10-30 — Cloudflare Preview configuration fix
- Diagnosed the failed Cloudflare Preview build from the supplied log: `npx wrangler preview` exited because `wrangler.toml` lacked a `[previews]` block.
- Added Preview-specific vars and a separate `BRO_CHAT_LIMITER` Preview binding with namespace ID `2026103002`; production vars and production limiter namespace were left unchanged.
- Fix commit: `7b2da16917558354f89a8128e29d950e98d1cfcf`.
- Cloudflare Preview rebuild and GitHub Actions for this commit are pending verification.
- No merge to `main` and no production deployment performed.

## 2026-10-30 — AI collaboration handover system
- Added `BRO_AI_MASTER_CONTEXT.md` as the shared project context for ChatGPT, Claude, and future collaborators.
- Added `PROJECT_STATUS.md` to separate verified facts from unknown/unverified checks.
- Added `TASK_NEXT.md` with the next concrete P0 task: verify the v1.0.1 foundation gate and diagnose the Cloudflare build failure from logs.
- Added `AI_WORK_RULES.md` with concise collaboration, safe coding, cost, security, and release rules.
- Handover documentation reflects the known project snapshot; live GitHub and CI state must be rechecked at the start of each session.
- No merge to `main` and no Cloudflare deployment are authorized by this documentation change.
- Initial handover commit (master context): `2a9c0d5c5176ad25b42ed255b13a45ca3744102a`.
- Handover files were committed sequentially on `bro-ai-v1.0-foundation`; see Git history for the complete sequence.

## 2026-10-30 — Verified handover status refresh
- Recorded foundation branch head `681e25bd00d2037f8410080caa3df56c87d99aa8` and PR #1 state (open, draft, not merged).
- Recorded that the latest commit has no verified GitHub Actions test result; CodeRabbit check was skipped, not passed.
- Recorded Cloudflare preview signals for earlier commits without treating them as proof for the latest head.
- Status update commit: `18d544e414a1f84ff9b5591b0c1a2e79d044b60c`.
- No merge or production deployment performed.

## 2026-10-30 — One-step AI entrypoint
- Added `AI_START_HERE.md` so a new Claude account or other AI collaborator has one short starting instruction and a defined first task.
- Linked the entrypoint from `BRO_AI_MASTER_CONTEXT.md` and clarified that verification data is a timestamped snapshot.
- Documentation-only correction: an unintended changelog file addition on `main` was immediately deleted; the file is absent from `main` again. No application code was changed there.
- Main cleanup commit: `981cd91b758bbb6b991016838a8ab97270ad6fde`.
- No merge or production deployment performed.
