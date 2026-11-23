# IMP-05 (D-F, AC-F; D-G) links in a Markdown file: in-file headings, files beside it, and links that go nowhere (MSP-44, MSP-45)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-44,MSP-45 --output-dir=<this folder>
# commit: working tree = 80322a5145 (run before committing; same files)
# env: macOS arm64, Node v22.23.1, Chrome headless (desktop 1280x900; phone 390x844, touch), loopback node "alpha"
# date: 2026-11-22 (run started 20:56:27Z)
# result: Pass (MSP-44 Pass, MSP-45 Pass; browserErrors 0). Also Pass in the whole probe on d4af72998f (IMP-08).
#
# MSP-44 desktop (Files viewer) and MSP-45 (Skills page): all 25 contents entries reach their heading, URL unchanged,
#   no new tab. other.md, other.md#x and ./x.md each open the file beside it (opened true, URL unchanged, no new tab).
#   #no-such-heading-480, /x.md and ../../out.md (out of the root) do nothing: still shown, scroll unchanged, no
#   "not found". The fixture uses ../../out.md because ../out.md resolves inside the probe's root.
# MSP-44 phone: the contents entries reach their headings; the three nothing-links do nothing. The three file links do
#   not open on the phone (opened false): recorded, not asserted, by the Solution Designer's decision DEC-009, follow-up
#   FU-004 (the case's comment cites both).
# MSP-46 now follows only #no-such-heading-480 (in the whole probe, IMP-08).
