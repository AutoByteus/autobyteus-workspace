# Actual application validation evidence
See ../../api-e2e-execution-coverage-report.md for authoritative API-REV-001 outcome, qualifications, commands and evidence mapping.

setup-fixtures.py is fresh-root-only; launch.py starts real backend/proxy/Nuxt with private HOME. Initial backend log was overwritten on setup restart; persistent observer log and dedicated proofs retain historic assertions. proxy.mjs ordinarily forwards actual traffic and can apply explicit owned-only rejection/delay. owned-ollama.mjs emulates only external LLM text generation for actual frontend/runtime/history proof; it is not real inference. Browser actions were through the approved browser tool and semantic controls; DOM evidence is not an injected renderer fixture.

All services stopped; no fault-control remains. Private data at worktree .local/api-sidebar retained for reproduction, including the user-selected non-sensitive testimage. Do not copy its .env/key/database or uploaded image into deliverable source or user data. No commit or release authorized.
