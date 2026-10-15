# CRR011 review execution limits

Initial read-only input audit incorrectly treated IR008 retainedArtifacts as a mapping; its actual shape is a list. AttributeError at audit-source.py line29, before a verdict. Corrected the reviewer parser only; reran against all actual entries. No product failure or source/test change. Initial broad reading commands exceeded output limits; smaller focused reads used for conclusions.

Initial reviewer report-generation guard counted the Markdown separator as a structural check (25 versus24) and stopped before changing canonical report/history. Corrected the parser to exclude the separator. Own scratch had already been removed; cleanup recheck is idempotent. No product change/failure.
