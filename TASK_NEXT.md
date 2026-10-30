# BRO AI — NEXT TASK

> Priority task list for the next AI collaborator. Verify repository state before starting.

## P0 — Verify the Preview configuration fix

**Goal:** Confirm Cloudflare Preview now builds after the missing `[previews]` block was fixed.

### Steps
1. Inspect latest head of `bro-ai-v1.0-foundation` and PR #1.
2. Open the newest Cloudflare Preview build for commit `7b2da16917558354f89a8128e29d950e98d1cfcf`.
3. Confirm `wrangler preview` no longer fails due to missing `previews` configuration.
4. If Wrangler reports a rate-limit namespace conflict, choose a confirmed-unused Preview namespace ID; do not reuse the production namespace.
5. Inspect GitHub Actions for the same commit:
   - `npm test`
   - Wrangler 4.36.0 deploy dry-run
6. Fix only confirmed remaining issues, add regression coverage where appropriate, and inspect the final diff.
7. Update `PROJECT_STATUS.md`, `TASK_NEXT.md`, and `CHANGELOG.md` with exact evidence.

### Acceptance criteria
- Cloudflare Preview build succeeds.
- Test suite passes on the latest foundation commit.
- Wrangler dry-run succeeds.
- No API keys or tokens are committed.
- No change is merged to `main` and no production Worker is deployed without explicit owner approval.

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
