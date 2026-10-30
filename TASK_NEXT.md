# BRO AI — NEXT TASK

> Priority task list for the next AI collaborator. Verify repository state before starting.

## P0 — Verify and close the v1.0.1 foundation gate

**Goal:** Establish whether the foundation branch is actually green and identify the exact cause of any Cloudflare build failure.

### Steps
1. Inspect the latest head SHA of `bro-ai-v1.0-foundation`.
2. Inspect PR #1 state, draft flag, mergeability, and all check runs.
3. Run or inspect the latest GitHub Actions run for that exact head:
   - `npm test`
   - Wrangler 4.36.0 deploy dry-run
4. Inspect the latest Cloudflare Workers build log. Previous Cloudflare failures were reported, but their root cause is unknown. Obtain the exact failing step and error text; do not infer.
5. Fix only confirmed issues. Add or update regression tests for each bug.
6. Re-run all checks and inspect the final diff.
7. Update `PROJECT_STATUS.md`, `TASK_NEXT.md`, and `CHANGELOG.md` with evidence.

### Acceptance criteria
- Test suite passes on the latest foundation commit.
- Wrangler dry-run succeeds.
- Cloudflare build succeeds or a clearly documented external blocker is provided.
- No API keys or tokens are committed.
- No change is merged to `main` and no Worker is deployed without explicit owner approval.

## P1 — Improve the handover workflow
After P0 is green:
- Add a lightweight CI check that flags missing/stale handover documents when source files change.
- Keep all status claims evidence-based.
- Consider generating a compact AI handover summary from repository state, without storing secrets or private chat data.

## P2 — Product roadmap (do not start before foundation is stable)
1. Durable cloud memory with user-controlled retention/export/deletion.
2. Research/search integration with source citations.
3. Voice improvements; clearly distinguish turn-based speech from realtime full-duplex.
4. Permissioned external action engine with allowlists, confirmation, audit trail, and idempotency.
5. Provider cost/quota visibility and user-configurable budget safeguards.

## Working instruction
Continue P0 immediately. Do not ask the owner to restate project context. Ask only if a deployment, merge, paid-provider activation, or other consequential decision requires explicit approval.
