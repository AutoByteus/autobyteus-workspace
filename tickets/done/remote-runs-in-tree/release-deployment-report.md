# Delivery / Release / Deployment Report — remote-runs-in-tree (autobyteus-278)

- **Release guide:** `RELEASE.md` at `27f2d2f72d`. Deviations: none.
- **Integration:** checkpoint `da46429f47`; clean merge `444dfc7ec2` of `27f2d2f72d`. DEL-01 … DEL-07 pass (`handoff-summary.md`).
- **Verification:** evidence `Sufficient` for AC-801 … AC-806:

| AC | Checked | Seen | Judgement |
| --- | --- | --- | --- |
| AC-801 | RTP-01 … 03 (run 22, DEL-07); RC-31/33/34 | Remote Team and Agent rows under the delegator in three families, tagged `beta-node`, with title, members and status | Proven |
| AC-802 | RTP-04; RC-31 | Opened remote run shows its conversation; the answer arrives live | Proven |
| AC-803 | RTP-04 screenshot; RC-31 | One owner message under "From the owner of node \"alpha-node\":"; the answer appears in alpha's window | Proven |
| AC-804 | RC-37; RTP-06/07 ×4 families | Error at about 0.2 s; the rest of the tree works; Retry from the row and from the notice recovers | Proven |
| AC-805 | RC-36 | Offline after idle; a window message restores it | Proven |
| AC-806 | RC-31/33/34; RTP-01 … 07 | Agent and Team targets; standalone, Team and Org delegators | Proven |
| AC-807 | — | The user's desktop ↔ Docker check | User Check: open |

- **Release decision:** `No release`.
- **Ticket moved to** `tickets/done/remote-runs-in-tree`: Yes.
- **Rollback:** revert the merge on `personal` and release forward.
