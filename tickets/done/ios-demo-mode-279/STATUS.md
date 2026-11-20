# autobyteus-279 — where it stands (paused 2026-11-18 for the stable release autobyteus-535)

- Apple's message obtained and saved (`evidence/apple-review/`): Guideline 2.1(a) — a demo account or a full-featured demo mode (a video is not enough), and a demo QR code.
- Founder's direction: a demo mode ("Try demo"), no test node; the design went to `/product_team` (team run `product_team_8f4986ea87424c66a80ac4496399e72c`, coordinator run `product_ui_ux_designer_313dd69fa4ff40d8a423bc1b850c54d0`); brief `product-design-request.md`.
- Design round 1 returned (design branch `design/ios-demo-mode-279` @ `cede2cff`); five decisions D1–D5 put to the founder (no answer yet). At his request I verified the demo against Apple's criteria: `evidence/demo-verification/verdict.md` — not ready: must fix V-01 (placeholder file text), V-02 (status mismatch list vs run), V-03 (share extension has no demo path); should fix V-04…V-08. Sent to the designer.
- Next when resumed: receive the designer's round 2, re-verify (`evidence/demo-verification/walk.mjs`, the probe in `/tmp/abt279` may be gone: re-copy the script), get the founder's answers to D1–D5 and his approval, then requirements approval and the engineering design.
- No requirements-doc/design-spec yet (Product stage). Nothing sent to Apple.
- 2026-11-18 round 2 verified (verdict.md Round 2): V-01 half fixed (Artifacts placeholder), R2-02 (reference on an old phone baseline). Round 3 (design branch `eb7bb3ef`): Artifacts fixed per the designer; the phone baseline is being refreshed against `origin/personal@f7b4d68711` in the Product team's baseline ticket `phone-baseline-refresh-279`; the designer sends the address for a round 3 walk when merged. Notes round 3 put Text size under the run list's ⋮ › On this phone.
- 2026-11-18 round 3 verified: ready to submit from Apple's criteria (verdict.md Round 3). Waiting for the founder's D1–D6 and approval; then the designer's final spec; then my requirements and engineering design.
- 2026-11-18: paused again for the beta autobyteus-538; state unchanged (waiting for the founder's D1–D6 and screen approval).
- 2026-11-19: strict reviewer sweeps rounds 4–6; round 6 clean (verdict.md). Waiting for the founder's D1–D6 and screen approval; then the designer's final spec; then requirements and engineering design with the acceptance criteria listed in verdict.md Round 6.
- 2026-11-19: founder: 'You were decides … a demo … 100% like how your real application works … how Android works' — decided D1–D5 as recommended; D6 changed: keep the share extension, working like Android (pairing link connects; other text pre-fills Type an address). Sent to the designer for the final spec.
- 2026-11-19: round 7 (final reference 78b51f73) clean, incl. the share paths; screens to the founder for approval.
- 2026-11-19: requirements approved; design SR-001 Ready (Large/High); sent to /architecture_reviewer (run architecture_reviewer_0d2d462ad7314114a525d1df31cf0c4f).
- 2026-11-19: ARCH-REV-001 Fail (AR-001 session/start order, AR-002 own-origin fetches, AR-003 icon sets); SR-002 resolves them; sent back to architecture review.
- 2026-11-19: ARCH-REV-002 Pass; implementation started (the reviewer handed off); N-1…N-3 aligned in the design (editorial).
- 2026-11-19: build tested; CRR-002 Design Impact F-1 (saved computers show 'AutoByteus Desktop' after the update); SR-003 (displayName migration + one known-name rule) sent to architecture review.
- 2026-11-19: ARCH-REV-003 Fail (AR-004: native labels showed addresses; no rename on open); SR-004 (Android's knownName/shownName rule) sent to architecture review.
- 2026-11-19: ARCH-REV-004 Pass; back with implementation (the reviewer handed off); N-5 applied (editorial).
