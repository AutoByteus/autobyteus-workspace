# SR032 — Terminal activity display approval pending

API006 observed a real Terminate journey: runtime is Offline and held inputs cleared, while an old card still says “Compacting memory…”. Runtime cancellation/no cancelled input dispatch and historical display are distinct.

Proposed bounded REQ013/AC018: preserve history, but show that activity as stopped by confirmed termination, not active. DEC03201 needs user approval; existing SR028 requirements/SR030 design stay authoritative. No new architecture selected. Continue other approved validation; retain this observation pending clarification, not Pass/Fail/waived under an unapproved assertion.

Full result terminal-compaction-activity.sr032.md; E32 and solution-recovery-evidence/sr032. Latest completed API005 Fail78.6; API006 ongoing; IR006/CRR010 source pass and reported desktop F007 retest do not establish overall acceptance. All prior gates and WIP retained; no SD source/test/runtime/model/finalization work.

API006 checkpoint now received: F007 closed on actual settings surface;346 selected repository assertions Pass and scoped scripted desktop recovery/cancellation paths observed. API006 is incomplete and its stage has stopped pending DEC03201/owner return; owned runtime resources cleaned. Latest completedAPI005Fail78.6 and all remaining gates unchanged. No terminal-card failure/Pass assertion, no new approval. Full checkpoint api-e2e-evidence/api-rev-006/README.md; receipt solution-recovery-evidence/sr032/api006-checkpoint-receipt.json.
