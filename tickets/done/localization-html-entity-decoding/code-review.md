Status: Pass

# Findings

No findings.

# Review Notes

1. The fix stays inside the localization runtime boundary, which is the correct owner for extracted catalog text normalization.
2. The implementation keeps translated output as plain text and does not introduce `v-html` or other HTML-rendering behavior.
3. The targeted tests cover the exact regression class and common related entities.
