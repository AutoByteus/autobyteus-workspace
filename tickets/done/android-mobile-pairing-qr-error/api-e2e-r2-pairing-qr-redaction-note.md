# API/E2E Pairing QR Redaction Note

The temporary API/E2E pairing QR HTML, PNG, session JSON, and QR-generation log were removed before repository finalization because they contained a raw `/mobile?pairing=` payload and one-time pairing code.

The validation report preserves the relevant non-sensitive outcome: the user scanned a valid Phone Access QR, Android connected successfully, and saved-node relaunch loaded Mobile Home without the prior `localeCompare` Error 500.
