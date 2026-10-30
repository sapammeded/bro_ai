# BRO AI — CHANGELOG

## 2026-10-30 — Browser security audit and Cloudflare Preview verification
- Added `tests/frontend-browser.test.cjs`, which launches Chromium and exercises the frontend against hostile HTML payloads in imported history, user input, and mocked assistant output.
- Added a CI step to install Chromium and run the browser regression suite.
- Verified browser test step PASS, existing test suite PASS, and Wrangler 4.156.0 dry-run PASS in GitHub Actions #59 (`41040419902`) on commit `585d772`.
- Verified Cloudflare Workers Builds Preview build and deployment SUCCESS on commit `585d772`; Preview deployment: `https://aa9c87c9-bro-ai.sapammeded.workers.dev`.
- Updated `PROJECT_STATUS.md` with verified outcomes.
- The status-documentation commit `cb001e3` also passed GitHub Actions #60 (`41040633459`) and Cloudflare Preview build/deployment (`e4441b0c-db7e-4785-a1f4-0eb93b6f1933`).
- Updated `TASK_NEXT.md`: P0 verification gates complete; remaining work is deeper security review and release preparation.
- Targeted browser regression tests are not an exhaustive security certification. sessionStorage reduces persistence but does not prevent same-origin script access during an active session.
- PR #1 remains open/draft. No merge to `main`, no production deployment, and no paid-provider activation.

## Earlier project history
See the entries below for the original foundation, Cloudflare Preview configuration fix, backend hardening, and AI handover work.
