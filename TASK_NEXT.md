# BRO AI — NEXT TASK

> Priority task list for the next AI collaborator. Verify repository state before starting.

## P0 — Verify backend hardening and current release gates

**Goal:** Confirm the latest response-size and total-timeout hardening passes CI and Cloudflare Preview.

### Steps
1. Inspect latest head of `bro-ai-v1.0-foundation` and PR #1.
2. Open the newest Cloudflare Preview build for the latest branch head (`01cd26a` or later).
3. Confirm `wrangler preview` no longer fails due to missing `previews` configuration.
4. Confirm CI uses Wrangler `4.156.0` (matching Cloudflare Builds), recognizes the `[previews]` config without warnings, and passes the 1 MiB response cap and 55-second total deadline tests.
5. If Wrangler reports a rate-limit namespace conflict, choose a confirmed-unused Preview namespace ID; do not reuse the production namespace.
6. Inspect GitHub Actions for the same commit:
   - `npm test`
   - Wrangler 4.156.0 deploy dry-run
7. Fix only confirmed remaining issues, add regression coverage where appropriate, and inspect the final diff.
8. Update `PROJECT_STATUS.md`, `TASK_NEXT.md`, and `CHANGELOG.md` with exact evidence.

### Acceptance criteria
- Cloudflare Preview build succeeds.
- Test suite passes on the latest foundation commit.
- Wrangler dry-run succeeds.
- No API keys or tokens are committed.
- No change is merged to `main` and no production Worker is deployed without explicit owner approval.

## P0 — Verify latest frontend security changes
- Confirmed on GitHub Actions #51: 12 handoff tests + 7 frontend security assertions + 20 Worker tests passed; Wrangler 4.156.0 dry-run passed.
- Still run a browser-based XSS/DOM test against user messages, imported history, persona labels, notes, and modal content.
- Verify Cloudflare Builds Preview on the latest head; GitHub Wrangler dry-run alone is insufficient.

## P1 — Close remaining security findings
- Decide on a dedicated BRO AI custom domain before production to reduce same-origin localStorage token exposure.
- Evaluate a safer short-lived/session-based frontend credential design; do not claim localStorage can be made safe against same-origin script execution. Consider a short-lived server-issued session/token exchange if a trusted authentication layer becomes available.
- Add adversarial frontend rendering tests for HTML/script payloads.

## P2 — Improve the handover workflow
After P0 is green:
- Add a lightweight CI check that flags missing/stale handover documents when source files change.
- Keep all status claims evidence-based.
- Consider generating a compact AI handover summary from repository state, without storing secrets or private chat data.

## P3 — Product roadmap (do not start before foundation is stable)
1. Durable cloud memory with user-controlled retention/export/deletion.
2. Research/search integration with source citations.
3. Voice improvements; clearly distinguish turn-based speech from realtime full-duplex.
4. Permissioned external action engine with allowlists, confirmation, audit trail, and idempotency.
5. Provider cost/quota visibility and user-configurable budget safeguards.

## Working instruction
Continue P0 immediately. Do not ask the owner to restate project context. Ask only if a deployment, merge, paid-provider activation, or other consequential decision requires explicit approval.
