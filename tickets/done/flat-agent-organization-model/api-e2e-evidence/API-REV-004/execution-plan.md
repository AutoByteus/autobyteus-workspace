# API-REV-004 Cumulative Real-System Validation Plan

## Gate and exact artifact

- Requirements: RER-021.
- Architecture: AD-REV-011 (AD-REV-009/010 mechanism); ARCH-REV-009 Pass.
- Implementation: IR-016; source 394fc27f896dac4121ef166cc0972b60e8b89ce4.
- Source review: CRR-017 cumulative Pass, 9.2/10.
- Artifact: b19c41e68c119f9a9590c5b04839454dae5f64b8.
- Prior API/E2E: API-REV-003 Fail / 92.9%.
- Classification: Large / High, reviewed route.

## Deterministic environment

- Verify and reuse the retained API-authored package only after complete
  PACKAGE.sha256 validation. Import it through the real Settings UI using an
  AutoByteus Chromium open_tab; do not seed the registry.
- Use API-REV-004-owned data, logs, temp workspace, ports 8457/3457, browser tab,
  and processes.
- Build and run the actual backend and production Nuxt renderer with exact
  NUXT_PUBLIC endpoints to 8457.
- Use real Codex App Server, gpt-5.6-sol, low reasoning, automatic tool approval
  for task flows.
- Retain DOM/API/provider/log/persistence/process/screenshots and post-run hashes.

## Ordered scenarios

1. Current exact and cumulative repository coverage: task settlement, atomic
   mixed history readiness, AgentRun shutdown fence, strict identity negatives,
   automatic recovery/exhaustion/clear, stopped history/focus, streams,
   migration/startup, Team/Org contracts, builds/guards and Brief Studio pack.
2. UI import and fixture/tool/topology verification.
3. Standalone Team fresh prompt, ordinary message and formal task
   submit/revise/resubmit/accept.
4. Mounted-Team-under-Org formal task recheck: one supported correct-address task
   must durably settle without identity rejection, root fail-stop or lost Org
   usability.
5. Real SIGTERM and same-data restart. The first mixed history query must retain
   standalone Team and Org rows; inactive Team selection must load exact prior
   task/message history and admit the first continuation; inactive Org history must
   render terminally and exact historical member selection must restore the same
   root, state, and conversation.
6. Valid server ERROR recovery: use current durable service coverage plus a
   browser-bound production-service harness if no safe live server trigger
   exists. Prove five bounded invisible attempts, one notice after exhaustion,
   no manual Reconnect, and clearing on later verified complete snapshot.
7. Stopped-history focus and continuation: historical AgentOrg focus uses the accepted
   Agent/Team surfaces; selecting an exact historical member restores the same root;
   no dedicated Restore or Reconnect action exists.
8. Strict identity/mismatched/family negatives and current migration/startup
   through repository/API evidence; no destructive mutation of retained live
   evidence.
9. Responsive 390x844 strip -> drawer -> Org tree focus, mounted Team status,
   and exact root Stop presentation.
10. Cleanup: stop all roots/processes, close tab, verify ports/PIDs/shared
    registry and fixture hashes; retain only isolated evidence.

## Result rule

Any critical failed acceptance criterion yields Fail. Pass additionally requires
at least 95% overall confidence, no category below 90%, and direct or current
durable proof for every material critical boundary. Stopped scopes are Not
Tested, never inferred.
