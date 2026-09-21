# API/E2E Test Case Ledger — ACTIVITY-RETAIN-20260914-001
Initial round; no prior result. Initialized before execution. Report is final authority; checkpoints not passes.
| Case | AC / expected | Event/result | Evidence |
|---|---|---|---|
| R01 | Real lifecycle/Activity narrow12 | Started | validation/api-narrow.log |
| R02 | Broader139 regression | Not Tested | pending R01 |
| SETUP | Fresh owned backend/frontend/model/sample | Not Tested | validation/api-runtime |
| B01 | AC001/002/004 Team stop/multi/empty/no activation | Not Tested | frontend required |
| B02 | AC003 later Send/identity/attachment/manual/no duplicates | Not Tested | frontend required |
| B03 | AC002 standalone Agent parity | Not Tested | frontend required |
| B04 | AC002 Org direct/mounted parity | Not Tested | frontend required |
| B05 | AC003/004 failed/duplicate Stop/stale decision | Not Tested | frontend plus owner controls |
| CLEANUP | Owned resources only | Not Started | no service started yet |

| R01 | AC001–004 narrow real owner/render | Completed Pass:2files12 | validation/api-narrow.log |
| R02 | Broader regression | Started | validation/api-broad.log |

| R02 | regression | Completed Pass11files139 includes12 narrow | validation/api-broad.log |
| SETUP | production build/shared/Prisma/bootstrap | Pass; starting owned services | validation/api-build.log |

| SETUP | New owned backend73109/frontend50391/collector50392 and public sample import ready | Pass | api-runtime/server-info.json, import.json |
| B01 | Actual frontend Team launch/Activity/Stop | Started | api-runtime |

| B01 | frontend Team created, manual=false, attached seeded file via actual Context Files paste and Send | Checkpoint: provider active/System1, awaiting actual tool; no acceptance conclusion | api-runtime/team-first-send-dom.txt |
| B03 | independent standalone parity while provider responds | Started | api-runtime |

| B01 | Team same-selected success Stop preserves expanded System/completed peer result + initial failed provider tool, draft; headerOffline/backendzero; worker ownSystem1, unused0 | Completed Pass | api-runtime/team-{before-stop,after-stop,offline-expanded-result,worker-offline,empty-offline}-dom.txt; telemetry/state |
| B02 | Later normal frontend Send/attachment/manual/old-new identity | Started | api-runtime |

| B02 | Actual later Team Send/manual Approve/peer result; same three old Activity IDs once + one new success; exact retained conversation/file link | Completed Pass core; attachment byte GET/identity final audit pending | api-runtime/team-resumed-dom.txt, team-continuation-once-proof.json |
| B03 | Native Agent read_file approved/completed; same-selected Terminate retains System+success2/expanded content/draft/Offline | Pass stop; continuation pending | api-runtime/agent-*-dom.txt |
| B04 | Actual Org launched coordinator-free/allOffline | Started direct/mounted parity | api-runtime |

| B05 | genuine manual pending tool→double Stop→retired stale approval | Started | api-runtime |

| B03 | Native Agent Stop/expanded history/draft/Offline then normal Send/manual approval/exact file marker; old2 IDs once + new1 | Completed Pass | api-runtime/agent-continuation-once-proof.json, agent-resumed-dom.txt |
| B05 | Actual pending tool→double-click Terminate→Offline Activity5; visible stale Approve click emits0 approval frames, no Team active/pending and no stale accepted message | Pass safety; exact duplicate mutation count only durable (fetch observer saw no Apollo requests) | api-runtime/team-stale-approval-no-dispatch-proof.json |
| B04 direct | same-focused Stop/Offline/rootStopped/System+completed2/expanded/draft preserved | Pass stop, later Send pending | api-runtime/org-direct-*.txt/json |

| B04 direct continuation | Real frontend Send/manual approval/exact marker succeeds; old IDs once, NEW native system capture+new read tool makes2→4 | Completed Pass direct path | api-runtime/org-direct-resumed-dom.txt, org-direct-continuation-proof.json |
| B04 mounted | Genuine first read work sent to mounted worker | Checkpoint awaiting result | api-runtime |

| B04 mounted | Real native read success/System2; same-selected Stop retains expanded args/result/draft2 while headerOffline/rootStopped; no Org runtimes after inspection | Completed Pass stop; continuation next | api-runtime/org-mounted-*-dom.txt/state/telemetry |

| B04 mounted continuation | Real frontend Send/manual approval/exact file marker; old2 IDs once + new read1, unrelated Org members remainOffline | Completed Pass | api-runtime/org-mounted-resumed-dom.txt, org-mounted-continuation-once-proof.json |
| B05 failed Stop | All normal journeys complete. Test-owned server crash then actual frontend Stop while last-known Team active | Started | api-runtime/team-before-server-loss-dom.txt |

| B05 failed Stop | Owned backend SIGKILL then real frontend Terminate: Failed to terminate team toast/Apollo Failed to fetch, same Idle last-known identity and Activity5; Result remains expandable. No fabricated Offline from command failure | Completed Pass | api-runtime/team-failed-stop-dom.txt, team-failed-stop-expanded-dom.txt/png, failed-stop-browser-errors.json |
| B02 attachment | Existing conversation file link opened actual browser preview containing exact marker after stop; initial file-picker unsupported was setup limitation | Completed Pass retention/access | api-runtime/retained-attachment-browser-dom.txt |
| CLEANUP | Four owned app/attachment tabs closed | Started | finalization log follows |

## Final reconciliation — API-REV-001
| R01/R02/SETUP | Current12/139 and production build | Completed Pass | current report/logs |
| B01–B05 | All promoted frontend journeys complete; exact controlled-only variants explicitly qualified in report | Pass | current report/evidence index |
| CLEANUP | Four owned tabs closed; backend fault/descendants exited; manager/frontend/collector stopped; ports empty; plugin removed | Completed Pass | validation/api-finalization.log |
| ROUND1 | Initial baseline, priorN/A; API-REV-001 Pass95.9%, Small/Low direct Delivery next | Completed | canonical report/revision record |
No active case. Earlier Started/Pending entries are checkpoint history, not latest outcome. No successful Delivery/user verification claimed.
