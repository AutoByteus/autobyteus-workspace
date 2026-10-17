# Reviewer tooling attempts

- Incoming raw/source audit passed its first execution (audit-console.log).
- First routing-file serialization command inserted JSON as Python syntax. Python
  refused with `NameError: name 'true' is not defined` before writing the file.
  Corrected by explicitly decoding the JSON string; no product/source/test change,
  verdict change or discarded execution evidence. Fresh routing rules are unchanged.
- Initial broad combined reads occasionally truncated; narrowed reads and full-file
  raw JSON/plist parsing used for conclusions. No hidden omitted-result assumption.
