# SR022 investigation attempt ledger

- Initial private public-image clone download exceeded the harness600s wait at83%; no
  VM or product process had started. Exact initial resource/script/download log retained
  under download-attempt-1. Resume uses only that same owned private cache/resource with
  a longer download wait; this is not a product failure, runtime retry fix or inherited
  API VM reuse.
- Script pre-execution review corrected run-prototype.py's worktree parent depth from4
  to5 before it ran; no product command was executed against the wrong path. Guest
  command allowance was raised to180s to allow engine restart/NFS grace independently
  of the measured post-close5s visibility contract; no fixed sleep masks the contract.
- Python syntax-only check generated local __pycache__, removed by owned cleanup.
  Neither syntax checking nor authoring audit is an implementation/API test Pass.

- First routing-persistence orchestration call had a JavaScript template-quoting
  ReferenceError before any shell command executed. Corrected in the subsequent call;
  no artifact or product action came from that failed call.
