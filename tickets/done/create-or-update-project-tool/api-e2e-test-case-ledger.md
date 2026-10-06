# API/E2E Test-Case Ledger

Initial round API-REV-001, 2026-10-06. Cases unresolved until attempted; evidence lives in api-e2e-evidence/. Source/current build and owned data only.

| Case | Expected | Observed | Evidence |
| --- | --- | --- | --- |
| P-001 | Narrow changed units pass | Pass | focused-unit.log: 4 files/115, no skips |
| P-002 | Current prebuild/build/bootstrap pass | Pass | prebuild.log + build.log; current dist/assets, Manager bootstrap smoke |
| E-001 | Selected catalog/Task/native/default-off and read-only denial | Pass | E-001.log: focused case(s); other cases intentionally unselected |
| E-002 | Multipart/context/Task lifecycle | Pass | E-002.log: focused case(s); other cases intentionally unselected |
| E-003 | Protected list and mutator collision/exact selection | Pass | E-003.log: focused case(s); other cases intentionally unselected |
| E-004 | GraphQL aggregate/real registration form regressions | Pass | E-004.log: focused case(s); other cases intentionally unselected |
| E-005 | Project create/patch/native/HTTP/strict errors atomic | Pass | E-005-isolated.log: 1 passed/7 intentionally unselected; private catalog 3 definitions. Initial inherited-env attempt retained in E-005.log |
| E-006 | Real links retention/replace/blank/[] atomic | Pass | E-006.log: focused single case, other cases intentionally unselected |
| E-007 | Existing-data and unrelated byte preservation | Pass | E-007-rerun.log: 1 pass/7 intentionally unselected; initial invalid physical assignment fixture failure retained in E-007.log |
| P-003 | Broader affected regressions pass, no skips | Pass | final-regression.log: all affected suites incl. built nodes; regression.log earlier 194 pass |
| E-008 | Two built nodes, locality/real saved reads/restart/bootstrap | Pass | E-008.log: 1/1 no skips, actual IDs/saved responses and explicit child/listener/data cleanup receipt |
| P-004 | Test typing/diff and cleanup | Pass | test-typecheck-final.log + source-typecheck.log exit0; node --check and diff hygiene exit0; final-regression.log explicit cleanup receipts |

Final regression reran E-001–008 together with broader affected suites; result Pass. Individual first attempts and local fixture correction remain indexed above.
