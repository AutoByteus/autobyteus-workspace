# AORG API25 current Team + Org test package

Import this entire directory through Settings → Agent Packages → Import Package.
Current RER029 / IR039 strict authored format: no schemaVersion in Team/Org definitions. Runtime TeamV2/OrgV1 are unchanged.

Contains 4 Agents, 2 flat Teams (research-squad/support-pair), and 2 Orgs (mixed/direct). All Agents explicitly configure submit_task_result and review_task_result. Same referenced Teams work standalone and mounted. Default Codex gpt-5.6-sol.

This separate package derives from API02 fixture without changing historical bytes. Team/Org configs differ only by removed version key; Markdown/Agent configuration and exact authored identities/handoffs remain. Product must treat this registered package as read-only.

Full current matrix is TEST-MANIFEST.md. PACKAGE.sha256 hashes all other package files. Prepared does not mean import/runtime tests passed.
