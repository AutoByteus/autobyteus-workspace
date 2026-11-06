# Solution Revision Record: run-expand-motion

| Revision | Date | Trigger | Requirements Change | Design Change | Approval |
| --- | --- | --- | --- | --- | --- |
| SR-001 | 2026-11-06 | Task autobyteus-390 | Initial: REQ-001…REQ-003, AC-001…AC-004 | Mount the delegated rows on expand (`v-if`) instead of hiding them (`v-show`); component test; browser regression probe. Small / Low | Solution Designer within the direction, user informed |
| SR-002 | 2026-11-06 | Code review CRR-001 CR-001 (Design Impact): late Task lines slide the rows after SR-001's `v-if` expand | REQ-004, UC-002 and AC-005 added; AC-001 now covers rows with Task lines. Within the direction: the user said "it's better to be normal" | The move transition `.tree-row-move` is removed and `v-show` restored. Tests updated, and a browser probe with late Task lines added as the local check. Still Small / Low | Solution Designer within the direction, user informed |
