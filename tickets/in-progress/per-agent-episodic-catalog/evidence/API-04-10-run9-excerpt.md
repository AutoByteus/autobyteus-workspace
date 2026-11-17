# API-04…API-10 excerpt: key observations of run 9 (the authoritative run of episodic-catalog.e2e.test.ts)
# Source: API-04-10-e2e-evidence/episodic-catalog-e2e.json (written by the test via EPISODIC_CATALOG_E2E_EVIDENCE_DIR); log API-04-10-episodic-catalog-e2e.log
# Worktree 89f35132ed (code 0be36462ef) + the new test; Node v22.23.1; macOS 26.5.2; 2026-11-17; host load 60-90

## Definitions
{
 "D": "ec-writer-3ec128",
 "H": "ec-host-3ec128",
 "E": "ec-solo-3ec128",
 "L": "team-local-agent:ec_local_team_3ec128:lead"
}

## EC-01: markers reached the journals and the run-history summary (none is in any file under episodic/: asserted)
{"user": true, "reply": true, "call": true, "result": true, "summary": true}

## EC-02
{
 "updateMs": 5059,
 "addMs": 4975,
 "burstMs": 6057,
 "burstTurns": [
  {
   "sentMs": 3,
   "journalMs": 10
  },
  {
   "sentMs": 2017,
   "journalMs": 2028
  },
  {
   "sentMs": 4036,
   "journalMs": 4043
  },
  {
   "sentMs": 6048,
   "journalMs": 6055
  }
 ],
 "distinctJournalVersions": 4,
 "catalogRewrites": 1
}

## EC-03
{
 "archived": [
  {
   "success": true,
   "message": "Run 'ec_writer_3ec128_d7961f22962441188e45f4c3182220eb' archived."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_3ec128_cb81141a4e1f4c37beb3f0d17bbe9a3b' archived."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_3ec128_d5a0528f3e6f48babb60787f05d850bc' archived."
  }
 ],
 "refused": {
  "success": false,
  "message": "Run is active. Terminate it before deleting history."
 },
 "deleted": [
  {
   "success": true,
   "message": "Run 'ec_writer_3ec128_8ba088db787d405dbef5339341b11d5c' deleted permanently."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_3ec128_1df15d4fbba94234919a6fb93e2cf1b7' deleted permanently."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_3ec128_ea4129a16fb1496d862eead98c25cb70' deleted permanently."
  }
 ],
 "deleteMs": 5145
}

## EC-04
{
 "healedMs": 5052,
 "failures": [
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"ec-writer-3ec128\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-zcMunt/memory/episodic/ec-writer-3ec128/catalog.md.6ce8a2122940.tmp'\"}",
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"index\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-zcMunt/memory/episodic/index.md.8f3f993bcf97.tmp'\"}"
 ],
 "turnsDuringFailure": [
  {
   "work_journal_active.md": 2850
  },
  {
   "work_journal_active.md": 5390
  }
 ]
}

## EC-05
{
 "listeningMs": 3536,
 "leadRestoredMs": 1,
 "written": [
  "ec-solo-3ec128/catalog.md",
  "ec-writer-3ec128/catalog.md",
  "index.md",
  "team-local-agent%3Aec_local_team_3ec128%3Alead/catalog.md"
 ],
 "outsideEpisodicChanged": [
  "run_history_index.json",
  "run_history_index.json.backup-2026-11-17T18-39-06-563Z",
  "team_run_history_index.json",
  "team_run_history_index.json.backup-2026-11-17T18-39-06-541Z"
 ],
 "migrationLines": [
  "Running Prisma migrations...",
  "27 migrations found in prisma/migrations",
  "No pending migrations to apply.",
  "Database migrations completed successfully.",
  "[2026-11-17T18:39:06.724Z] [WARN] [server.runtime] Studio app-data migration '20260824_team_run_execution_tree_v2' is FAILED: 4 TeamRun execution trees could not be upgraded to V2.",
  "[2026-11-17T18:39:06.725Z] [WARN] [server.runtime] Studio app-data migration '20260731_migrate_native_working_context_snapshots_v5' is FAILED: 2 native snapshot migration items failed.",
  "[2026-11-17T18:39:06.725Z] [WARN] [server.runtime] Studio app-data migration '20261018_append_only_message_logs_v1' is FAILED: Waiting for 20260901_agent_org_flat_team_families_v1, 20260926_team_context_file_execution_locators_v1; the next start continues."
 ],
 "serverLines": []
}

## EC-06
{
 "listeningMs": 3596,
 "builtWithinMs": 8672,
 "outsideEpisodicChanged": [],
 "t3Lines": [],
 "serverLines": []
}

## EC-07
{
 "listeningMs": 2621,
 "changed": [],
 "outsideEpisodicChanged": []
}

