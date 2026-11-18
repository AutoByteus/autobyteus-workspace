# API-04…API-10 excerpt: key observations of round 3 (episodic-catalog.e2e.test.ts, all 7 pass)
# Source: API-04-10-e2e-evidence/episodic-catalog-e2e.json; log API-04-10-episodic-catalog-e2e.log
# Code 1324c3e8f4 + the test as committed; Node v22.23.1; macOS 26.5.2; 2026-11-18
# Note: warning texts are cut at the first '}' (the test's matcher); the root and record come before it

## Definitions
{
 "D": "ec-writer-e06c54",
 "H": "ec-host-e06c54",
 "E": "ec-solo-e06c54",
 "L": "team-local-agent:ec_local_team_e06c54:lead"
}

## EC-01: markers reached the journals and the run-history summary (none is in any file under episodic/: asserted)
{"user": true, "reply": true, "call": true, "result": true, "summary": true}

## EC-02
{
 "updateMs": 5006,
 "addMs": 5050,
 "burstMs": 6238,
 "burstTurns": [
  {
   "sentMs": 8,
   "journalMs": 22
  },
  {
   "sentMs": 2029,
   "journalMs": 2036
  },
  {
   "sentMs": 4044,
   "journalMs": 4053
  },
  {
   "sentMs": 6153,
   "journalMs": 6218
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
   "message": "Run 'ec_writer_e06c54_402defdefe974ee9b12321e883ecd0c0' archived."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_e06c54_b585f3591b2a4d8bb38bebd2bf382ad7' archived."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_e06c54_6ca8dd7099a34fd2b7328b229c9348b0' archived."
  }
 ],
 "refused": {
  "success": false,
  "message": "Run is active. Terminate it before deleting history."
 },
 "deleted": [
  {
   "success": true,
   "message": "Run 'ec_writer_e06c54_51c9ef5f3ea049bd84fd16c471f4aabc' deleted permanently."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_e06c54_766ca8a2d450490cb161e7e34ffca5da' deleted permanently."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_e06c54_8d76f52a101146b586002be5d8488584' deleted permanently."
  }
 ],
 "deleteMs": 5190
}

## EC-04
{
 "healedMs": 5072,
 "failures": [
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"ec-writer-e06c54\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-E4xcTu/memory/episodic/ec-writer-e06c54/catalog.md.ad533de9bee4.tmp'\"}",
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"index\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-E4xcTu/memory/episodic/index.md.64cbd43990a6.tmp'\"}"
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
 "listeningMs": 5839,
 "leadRestoredMs": 1,
 "written": [
  "ec-solo-e06c54/catalog.md",
  "ec-writer-e06c54/catalog.md",
  "index.md",
  "team-local-agent%3Aec_local_team_e06c54%3Alead/catalog.md"
 ],
 "outsideEpisodicChanged": [
  "run_history_index.json",
  "run_history_index.json.backup-2026-11-17T22-57-28-733Z",
  "team_run_history_index.json",
  "team_run_history_index.json.backup-2026-11-17T22-57-28-709Z"
 ],
 "migrationLines": [
  "Running Prisma migrations...",
  "27 migrations found in prisma/migrations",
  "No pending migrations to apply.",
  "Database migrations completed successfully.",
  "[2026-11-17T22:57:28.966Z] [WARN] [server.runtime] Studio app-data migration '20260824_team_run_execution_tree_v2' is FAILED: 4 TeamRun execution trees could not be upgraded to V2.",
  "[2026-11-17T22:57:28.966Z] [WARN] [server.runtime] Studio app-data migration '20260731_migrate_native_working_context_snapshots_v5' is FAILED: 2 native snapshot migration items failed.",
  "[2026-11-17T22:57:28.966Z] [WARN] [server.runtime] Studio app-data migration '20261018_append_only_message_logs_v1' is FAILED: Waiting for 20260901_agent_org_flat_team_families_v1, 20260926_team_context_file_execution_locators_v1; the next start continues."
 ],
 "serverLines": []
}

## EC-06
{
 "listeningMs": 3789,
 "builtWithinMs": 8878,
 "outsideEpisodicChanged": [],
 "t3Warnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent_team:ec_squad_e06c54_b07409295a14408f8ec14a6a67d96094',\n  record: 'team_run_execution_tree.json',\n  reason: 'ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: Unterminated string in JSON at position 941 (line 27 column 25)',\n  runFolders: 1\n}"
 ],
 "o3Warnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent_org:ec_org_e06c54_2b76206800a343afa01908581c42286f',\n  record: 'agent_org_run_execution_tree.json',\n  reason: \"ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: Expected property name or '}"
 ],
 "copy2LeftOut": [
  "EPISODIC_CATALOG_RUN_LEFT_OUT {\n  root: 'agent:ec_writer_e06c54_7b1b539594eb41018dded41a0559787f',\n  run: 'agents/ec_writer_e06c54_7b1b539594eb41018dded41a0559787f',\n  reason: 'work_journal_manifest.json is not JSON: Unterminated string in JSON at position 203 (line 7 column 44)'\n}"
 ],
 "aMetadataWarnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent:ec_writer_e06c54_734233bb906342ab854f3dc50c4872b2',\n  record: 'run_metadata.json',\n  reason: 'Unterminated string in JSON at position 378 (line 5 column 157)',\n  runFolders: 1\n}"
 ],
 "serverLines": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {",
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {",
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {",
  "EPISODIC_CATALOG_RUN_LEFT_OUT {"
 ]
}

## EC-07
{
 "listeningMs": 3354,
 "changed": [],
 "outsideEpisodicChanged": []
}

