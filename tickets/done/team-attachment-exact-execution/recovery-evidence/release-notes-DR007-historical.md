# Recovery candidate — local Electron user test (DR-005)

Not a published release. Version label remains1.4.87; identify by DR005 artifact/checksum.

- Recover application startup when retained incomplete historical Team roots coexist
  with valid data. Preserve unavailable history rather than globally blocking startup.
- Validate current package/reference admission independently of migration ledger status.
  New work remains available even if historical packages cannot be admitted.
- Keep exact attachment ownership and original/backup/hash protections. Real attempt
  failures stay FAILED; no fabricated success, address fallback or deleted history.
- Strengthen canonical migration guideline and companion Solution Designer requirements;
  companion workflow changes are not yet integrated/deployed.

Candidate validation:296 tests plus packaged first/repeat startup on a full installed
copy passed upstream. Your installed data was not repaired. User verification pending.
