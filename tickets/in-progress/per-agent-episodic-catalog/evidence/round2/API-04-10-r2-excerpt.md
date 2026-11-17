# API-04…API-10 excerpt: key observations of round 2 run 4 (the authoritative run; all 7 pass)
# Source: API-04-10-e2e-evidence/episodic-catalog-e2e.json; log API-04-10-episodic-catalog-e2e.log
# Code 159286c1c1 + the test as committed; Node v22.23.1; macOS 26.5.2; 2026-11-17; host load 75-150
# Note: warning texts are cut at the first '}' (the test's matcher); the root and record come before it

## Definitions
{
 "D": "ec-writer-69b8dc",
 "H": "ec-host-69b8dc",
 "E": "ec-solo-69b8dc",
 "L": "team-local-agent:ec_local_team_69b8dc:lead"
}

## EC-01: markers reached the journals and the run-history summary (none is in any file under episodic/: asserted)
{"user": true, "reply": true, "call": true, "result": true, "summary": true}

## EC-02
{
 "updateMs": 5059,
 "addMs": 5030,
 "burstMs": 6310,
 "burstTurns": [
  {
   "sentMs": 32,
   "journalMs": 77
  },
  {
   "sentMs": 2096,
   "journalMs": 2114
  },
  {
   "sentMs": 4125,
   "journalMs": 4197
  },
  {
   "sentMs": 6225,
   "journalMs": 6298
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
   "message": "Run 'ec_writer_69b8dc_d7a30fd91a364f55874dcf322bf83315' archived."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_69b8dc_1883273acf504878a7cb9ea7922873be' archived."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_69b8dc_dd5c1849277f44e486edd3e242cccca5' archived."
  }
 ],
 "refused": {
  "success": false,
  "message": "Run is active. Terminate it before deleting history."
 },
 "deleted": [
  {
   "success": true,
   "message": "Run 'ec_writer_69b8dc_6fa2062f085941cbb53e7babb83e7932' deleted permanently."
  },
  {
   "success": true,
   "message": "Team run 'ec_squad_69b8dc_80e3d93cab7d4d4aaacd83838fe89fa4' deleted permanently."
  },
  {
   "success": true,
   "message": "AgentOrg run 'ec_org_69b8dc_1d3ba8d527b3461bbd125fb078230900' deleted permanently."
  }
 ],
 "deleteMs": 5074
}

## EC-04
{
 "healedMs": 5046,
 "failures": [
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"ec-writer-69b8dc\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-ZiuG5X/memory/episodic/ec-writer-69b8dc/catalog.md.269a8d9be8ac.tmp'\"}",
  "EPISODIC_CATALOG_WRITE_FAILED {\"file\":\"index\",\"error\":\"EACCES: permission denied, open '/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/episodic-catalog-e2e-ZiuG5X/memory/episodic/index.md.691736ba7141.tmp'\"}"
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
 "listeningMs": 4065,
 "leadRestoredMs": 51,
 "written": [
  "ec-solo-69b8dc/catalog.md",
  "ec-writer-69b8dc/catalog.md",
  "index.md",
  "team-local-agent%3Aec_local_team_69b8dc%3Alead/catalog.md"
 ],
 "outsideEpisodicChanged": [
  "run_history_index.json",
  "run_history_index.json.backup-2026-11-17T22-38-15-534Z",
  "team_run_history_index.json",
  "team_run_history_index.json.backup-2026-11-17T22-38-15-512Z"
 ],
 "migrationLines": [
  "Running Prisma migrations...",
  "27 migrations found in prisma/migrations",
  "No pending migrations to apply.",
  "Database migrations completed successfully.",
  "[2026-11-17T22:38:15.685Z] [WARN] [server.runtime] Studio app-data migration '20260824_team_run_execution_tree_v2' is FAILED: 4 TeamRun execution trees could not be upgraded to V2.",
  "[2026-11-17T22:38:15.686Z] [WARN] [server.runtime] Studio app-data migration '20260731_migrate_native_working_context_snapshots_v5' is FAILED: 2 native snapshot migration items failed.",
  "[2026-11-17T22:38:15.686Z] [WARN] [server.runtime] Studio app-data migration '20261018_append_only_message_logs_v1' is FAILED: Waiting for 20260901_agent_org_flat_team_families_v1, 20260926_team_context_file_execution_locators_v1; the next start continues."
 ],
 "serverLines": []
}

## EC-06
{
 "listeningMs": 2546,
 "builtWithinMs": 7632,
 "outsideEpisodicChanged": [],
 "t3Warnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent_team:ec_squad_69b8dc_520989d7fee142ebac1ff3863ad49648',\n  record: 'team_run_execution_tree.json',\n  reason: 'ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: Unterminated string in JSON at position 941 (line 27 column 25)',\n  runFolders: 1\n}"
 ],
 "o3Warnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent_org:ec_org_69b8dc_79cff18c2cd842fd886993ad5147df3e',\n  record: 'agent_org_run_execution_tree.json',\n  reason: \"ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: Expected property name or '}"
 ],
 "copy2LeftOut": [
  "EPISODIC_CATALOG_RUN_LEFT_OUT {\n  root: 'agent:ec_writer_69b8dc_c3d9cb53826046909105ec1ab598010c',\n  run: 'agents/ec_writer_69b8dc_c3d9cb53826046909105ec1ab598010c',\n  reason: 'work_journal_manifest.json is not JSON: Unterminated string in JSON at position 203 (line 7 column 44)'\n}"
 ],
 "aMetadataWarnings": [
  "RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE {\n  root: 'agent:ec_writer_69b8dc_f905aa60229e4559a9f2740cb1a9ff8b',\n  record: 'run_metadata.json',\n  reason: 'Unterminated string in JSON at position 378 (line 5 column 157)',\n  runFolders: 1\n}"
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
 "listeningMs": 2943,
 "changed": [],
 "outsideEpisodicChanged": []
}

