# CR-001 evidence: the wrapper's final `exit` runs `~/.bash_logout` on every foreground call

Reviewer probes, 2026-11-10, worktree at `e26460bf57`, macOS bash 3.2.57 and `node:22-bookworm` bash 5.2.

## 1. Raw bash: the production invocation `bash --noprofile --norc -lc` (unchanged by this ticket)

```
$ d=$(mktemp -d); echo 'echo LOGOUT-RAN >&2' > $d/.bash_logout
$ HOME=$d /bin/bash --noprofile --norc -lc 'echo hi; exit 0'
hi
LOGOUT-RAN
$ HOME=$d /bin/bash --noprofile --norc -lc 'echo hi'
hi
$ docker run --rm -v $d:/h:ro -e HOME=/h node:22-bookworm bash --noprofile --norc -lc 'echo hi5; exit 0'
hi5
LOGOUT-RAN
```

A login shell (`-l`) reads `~/.bash_logout` when the `exit` builtin runs; `--noprofile` does not prevent it.
Without `exit` (every ordinary command on the base branch) it is not read.

Other paths:

```
'trap "exit 4" EXIT; exit 3'   -> LOGOUT once, rc=4
'trap "exit 4" EXIT; true'     -> LOGOUT once, rc=4   (an exit inside the EXIT trap also reads it)
'f(){ return 5; }; f'          -> no LOGOUT, rc=5      (status through a function, no exit builtin)
```

## 2. Through `runBash` and the real launcher (temporary test file, removed afterwards)

`process.env.HOME` pointed at a temp folder whose `.bash_logout` appends a line to a marker file; then
`runBash(ctx, 'echo hi', null, 30, false)`:

```
{"result":{"exitCode":0,"effectiveCwd":"…/cr338-o0rYg1","stdout":"hi\n"},"logoutRuns":1}
```

The result is unchanged; the user's logout script ran once for an ordinary `echo hi`. On the base branch the same
call (`bash --noprofile --norc -lc 'echo hi'`) does not run it. The wrapper's `__ab_fg_end` ends with
`builtin exit "$__ab_rc"` (`command-wrapper.ts` L57).
