# API-REV-031 frontend binding correction

The first frontend launch used `NUXT_PUBLIC_*` variable names. Current `nuxt.config.ts` selects the development backend from `BACKEND_NODE_BASE_URL` and derives all HTTP/WebSocket endpoints from that single value. The initial browser attempt therefore targeted the default localhost:8000 and was excluded as an API/E2E environment setup attempt; it created no Team run and did not exercise IR-037.

The API/E2E-owned frontend was stopped and relaunched with `BACKEND_NODE_BASE_URL=http://127.0.0.1:60231` plus explicit matching BACKEND endpoint variables. A clean-browser diagnostic then proved the runtime default node and every endpoint resolved to the owned 60231 server, the imported Team card was present, and no failed network request remained. The disposable backend/database was unchanged and the operational database/protected stack were untouched.
