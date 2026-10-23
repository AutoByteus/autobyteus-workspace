# Solution Revision Record: clean-checkout-build-fix

| Revision | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Design | Task autobyteus-282 (urgent) | N/A | Approved; design Ready, Medium / Low | Restore frozen memory copies from the unchanged library at 280's freeze; anchor the ignore rule to `/memory/`; tracked-import check in the hygiene script plus a server architecture test |
| SR-002 | Design (implementation Design Impact) | Whole-file restore pulls 68 files and conflicts with pruned tracked siblings | Design Ready (SR-001) | Design Ready | D-1 = restore, then run 280's deterministic pruner (line-subset evidence); commit the pruner; classification unchanged |
