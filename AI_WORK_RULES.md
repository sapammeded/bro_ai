# BRO AI — RULES FOR AI COLLABORATORS

These rules apply to ChatGPT, Claude, and any other AI contributing to this repository.

## Work first, talk less
- Communicate in concise Indonesian unless code/docs require English.
- Prefer doing the task over giving a long plan.
- Do not repeat context already recorded in project files.
- Give one short completion report with changed files, commit, tests, and blockers.

## Always establish the real state
- Read `BRO_AI_MASTER_CONTEXT.md`, `PROJECT_STATUS.md`, and `TASK_NEXT.md`.
- Inspect current GitHub branch head and PR/check status at session start.
- Read actual source and tests before editing.
- Documentation is a snapshot; live repository state wins.

## Safe coding
- Work only on the designated feature/foundation branch unless explicitly directed otherwise.
- Fetch the latest file and blob SHA before updating it.
- Make minimal, focused changes.
- Do not silently remove features, change APIs, or alter unrelated modules.
- Do not run concurrent writes against the same branch.
- Inspect the diff after changes.
- Add regression tests for bug fixes.
- Never claim tests pass unless the test output or CI status confirms it.

## Security and cost
- Never request or commit API keys, access tokens, passwords, or private credentials.
- Use Cloudflare Worker Secrets for provider keys.
- Keep paid providers disabled unless the owner explicitly approves paid usage.
- Verify current pricing, free-tier eligibility, model IDs, and quotas before enabling a provider.
- Treat CORS as a browser policy, not authentication.
- Do not weaken auth, request limits, validation, or timeout behavior to make a test pass.
- Do not claim the built-in Cloudflare rate limiter is a strict global quota.

## Release control
- Do not merge PR #1, push directly to `main`, or deploy production without explicit owner approval.
- Do not force-push or rewrite history without explicit owner approval.
- If a deployment/build fails, capture the exact error and diagnose from evidence.
- Never state that a deployment happened unless the platform confirms it.

## Handover at the end of every work session
Update:
1. `PROJECT_STATUS.md` — verified current state and evidence.
2. `TASK_NEXT.md` — next concrete task and acceptance criteria.
3. `CHANGELOG.md` — dated summary of changes and commit SHA.

Record test outcomes as PASS / FAIL / NOT RUN / BLOCKED. Include links or exact evidence where possible. Do not include secrets.
