# BRO AI — NEXT TASK

> Status checked 2026-10-30. Verify live GitHub/Cloudflare state before acting.

## P0 — Foundation verification gates: COMPLETE

- GitHub Actions #59 on commit `585d772`: PASS.
- Chromium browser DOM/XSS regression tests: PASS for token migration/session storage, imported history, user messages, and assistant responses.
- Worker unit tests and static frontend security assertions: PASS.
- Wrangler 4.156.0 `deploy --dry-run`: PASS.
- Cloudflare Workers Builds Preview: Build + Preview deployment SUCCESS on commit `cb001e3`; preview URL is `https://e4441b0c-bro-ai.sapammeded.workers.dev`.
- GitHub Actions #60 on documentation head `cb001e3`: PASS.
- PR #1 remains OPEN / DRAFT / NOT MERGED. No production deployment. Owner has not authorized merge or release.

## P1 — Complete security review before release

1. Review the final PR diff for any untested HTML/DOM sinks, especially `openModal`, imported data, webapp labels/URLs, notes, and any future Markdown changes.
2. Expand Chromium tests for malicious persona labels, notes, webapp names/URLs, malformed imported JSON, and repeated chat rendering.
3. Evaluate a short-lived server-issued session design so a long-lived shared Bearer token is not exposed to same-origin JavaScript. Do not claim `sessionStorage` prevents XSS access.
4. Evaluate a dedicated origin and a restrictive Content Security Policy. Do not weaken current authentication or provider limits.
5. Confirm Preview and production rate-limit namespace IDs are unique in the Cloudflare account before any production deployment.
6. Keep paid providers disabled and secrets out of Git.

## P2 — Release readiness (approval required)

- Prepare a release checklist and rollback plan.
- Verify required Worker Secrets and allowed origin without exposing credentials.
- Test the app from Android Chrome against the Preview Worker using owner-controlled credentials.
- Ask the owner for explicit approval before merging PR #1 or deploying production.

## P3 — Product roadmap (after foundation release)

1. Durable cloud memory with user-controlled retention/export/deletion.
2. Research/search integration with source citations.
3. Voice improvements; clearly distinguish turn-based speech from realtime full-duplex.
4. Permissioned external action engine with allowlists, confirmation, audit trail, and idempotency.
5. Provider cost/quota visibility and user-configurable budget safeguards.

## Working instruction

Continue P1 security review. Never merge PR #1, deploy production, enable paid providers, or change secrets without explicit owner approval.
