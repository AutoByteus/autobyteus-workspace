#!/bin/bash
# autobyteus-338 SR-004: probe of the corrected command wrapper (both forms) on this machine's bash.
# Run: /bin/bash wrapper-skeleton-probe.sh   (log: wrapper-skeleton-probe.log)
# Frames go to a descriptor duplicated before the user block (fd 63); the stdout end marker goes to fd 62.
# Real frames are nonce-framed (\036<nonce>:BODY\037); this probe prints plain "FRAME BODY" lines.
# Each case runs in its own process group (perl setpgrp), as the anchor's group does in production.
NONCE=probe

foreground_wrapper() { # $1 = the user's command text, appended as written (never parsed)
cat <<EOF
exec 62>&1 63>&2
__ab_fg_end() {
  __ab_rc=\$1
  builtin set +e +u +o pipefail; builtin unset IFS
  builtin trap - ERR DEBUG
  __ab_user_exit=\$(builtin trap -p EXIT)
  builtin trap - EXIT
  case "\$__ab_user_exit" in
    ''|*__ab_fg_end*) ;;
    *) __ab_run() { builtin eval "\$1"; }; builtin eval "__ab_run \${__ab_user_exit#trap -- }" ;;
  esac
  builtin trap '' TERM
  builtin unset -f jobs 2>/dev/null
  __ab_pids=\$(jobs -p)
  __ab_pids=\$(builtin echo \$__ab_pids)
  builtin printf '%s\n' '$NONCE:END' >&62
  builtin printf 'FRAME FOREGROUND_DONE %s %s\n' "\$__ab_rc" "\$__ab_pids" >&63
  while builtin test -n "\$__ab_pids"; do
    __ab_left=
    for __ab_p in \$__ab_pids; do
      if builtin kill -0 "\$__ab_p" 2>/dev/null; then __ab_left="\$__ab_left \$__ab_p"
      else builtin wait "\$__ab_p"; builtin printf 'FRAME JOB_ENDED %s %s\n' "\$__ab_p" "\$?" >&63; fi
    done
    __ab_pids=\$__ab_left
    builtin test -n "\$__ab_pids" && builtin command sleep 0.1
  done
  builtin exit "\$__ab_rc"
}
builtin trap '{ __ab_rc=\$?; builtin set +x; } 2>/dev/null; __ab_fg_end "\$__ab_rc"' EXIT
{
$1
}
{ __ab_rc=\$?; builtin set +x; } 2>/dev/null
__ab_fg_end "\$__ab_rc"
EOF
}

background_wrapper() { # POSIX sh: works under bash and sh; the user's code runs only inside the job
cat <<EOF
exec 62>&1 63>&2
( trap 'trap - TERM; kill -TERM 0' TERM
  {
$1
  } & wait \$!
) &
__ab_job=\$!
trap '' TERM
printf '%s\n' '$NONCE:END' >&62
printf 'FRAME FOREGROUND_DONE 0 %s\n' "\$__ab_job" >&63
wait "\$__ab_job"; printf 'FRAME JOB_ENDED %s %s\n' "\$__ab_job" "\$?" >&63
EOF
}

ts() { perl -MTime::HiRes=time -e 'printf "%.3f", time'; }
group_of() { ps -axo pgid=,comm= | awk -v g="$1" '$1==g{print $2}' | tr '\n' ' '; }

run_case() { # name, shell, script, [action after FOREGROUND_DONE]
  local name=$1 shell=$2 script=$3 action=$4 out err t0
  out=$(mktemp); err=$(mktemp)
  perl -e 'setpgrp(0,0); exec @ARGV' "$shell" -c "$script" >"$out" 2>"$err" &
  CASE_PID=$!; t0=$(ts); fg=""
  for _ in $(seq 1 60); do fg=$(grep -m1 'FRAME FOREGROUND_DONE' "$err"); [ -n "$fg" ] && break; sleep 0.05; done
  echo "== $name"
  echo "   $fg (seen after $(perl -e "printf '%.2f', $(ts)-$t0") s)"
  if [ -n "$action" ]; then eval "$action"; fi
  sleep "${WAIT:-1.5}"
  echo "   stdout: $(tr '\n' '|' <"$out")"
  echo "   stderr (user part): $(grep -v '^FRAME' "$err" | tr '\n' '|')"
  grep 'FRAME JOB_ENDED' "$err" | sed 's/^/   /'
  echo "   group left: [$(group_of "$CASE_PID")]"
  kill -KILL -- -"$CASE_PID" 2>/dev/null
  rm -f "$out" "$err"
}

echo "bash: $BASH_VERSION"
run_case "1 plain command, exit 3" bash "$(foreground_wrapper 'echo out; echo err >&2; exit 3')"
run_case "2 set -e + failing & job" bash "$(foreground_wrapper 'set -e; (sleep 0.2; exit 3) & echo started')"
run_case "3 set -e + failing foreground" bash "$(foreground_wrapper 'set -e; false; echo not-reached')"
run_case "4 set -x" bash "$(foreground_wrapper 'set -x; echo hi')"
run_case "5 user EXIT trap stops its server at command end" bash "$(foreground_wrapper 'sleep 30 & P=$!; trap "kill $P" EXIT; echo checks-done')"
run_case "6 exec >/dev/null 2>&1, then a job" bash "$(foreground_wrapper 'exec >/dev/null 2>&1; (sleep 0.3; exit 4) & echo hidden')"
run_case "7 two & jobs, exit codes 3 and 7" bash "$(foreground_wrapper '(sleep 0.3; exit 3) & (sleep 0.8; exit 7) & echo started')"
run_case "8 background form (bash): kill <pid> stops everything it started" bash \
  "$(background_wrapper 'npm_like() { sleep 100; }; npm_like & sleep 101')" \
  'J=$(echo "$fg" | awk "{print \$4}"); sleep 0.3; echo "   group before kill: [$(group_of $CASE_PID)]"; kill $J; sleep 0.5; echo "   group 0.5 s after kill $J: [$(group_of $CASE_PID)]"'
run_case "9 background form (sh): exit 5" sh "$(background_wrapper 'sleep 0.2; exit 5')"
WAIT=0.5 run_case "10 kill of a & job: kill to JOB_ENDED timing" bash "$(foreground_wrapper 'sleep 30 & echo started')" \
  'P=$(echo "$fg" | awk "{print \$4}"); K=$(ts); kill $P; for _ in $(seq 1 80); do if ! kill -0 $P 2>/dev/null; then echo "   kill -0 on the job fails $(perl -e "printf q(%.3f), $(ts)-$K") s after the kill"; break; fi; sleep 0.002; done'
run_case "11 plain & job with children: kill <pid> (narrowed REQ-011)" bash "$(foreground_wrapper '(sh -c "sleep 105 & sleep 106") & echo started')" \
  'P=$(echo "$fg" | awk "{print \$4}"); sleep 0.2; kill $P; sleep 0.3; echo "   group after kill $P: [$(group_of $CASE_PID)]"'
run_case "12 bash strict mode (set -euo pipefail; IFS=newline-tab) + two jobs" bash "$(foreground_wrapper 'set -euo pipefail; IFS=$'"'"'\n\t'"'"'; (sleep 0.3; exit 3) & (sleep 0.6; exit 7) & echo started')"
