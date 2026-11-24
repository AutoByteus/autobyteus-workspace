# IMP-03b (D-1, D-2; AC-001…AC-003) MSP-105 on the fixed tree
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105 --output-dir=<this folder>
# commit: 2bb11e0874 (D-1 d67b58c740, D-2 1c6f493625)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback node alpha, scripted AGY
# date: 2026-11-23
# result: Pass. A Team ("Order Team") whose /lead uses the case's own agent; each round changes that agent's tools, so
#   the node puts a "Tools updated" notice in front of /lead's next input. Each round's own phone has its Date offset
#   (measured -2000, +2000, -2000 ms):
#   - 2 s behind, the phone sends; 2 s ahead, the phone sends; 2 s behind, the phone only watches (the message sent
#     through the Team stream by another client);
#   - live and reopened, every round reads: previous reply, the message, "Tools updated", the reply;
#   - /lead's conversation entries from the node hold the notice right after the message (nodeOrder in the JSON).
# Why a Team member: only the Team stream's MEMBER_INPUT_MESSAGE carries the node's received_at; a standalone run's
# echo takes the viewer's clock, so a standalone run does not show the bug (an earlier standalone version of the case
# passed on the base window; recorded in the handoff).
