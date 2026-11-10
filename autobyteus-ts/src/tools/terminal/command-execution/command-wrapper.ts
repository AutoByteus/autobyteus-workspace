/**
 * The command wrapper every `run_bash` call runs through (autobyteus-338, design "Command Wrapper Contract").
 *
 * The user's text is appended as written, never parsed. When its foreground part ends, the wrapper writes the
 * stdout end marker and a `FOREGROUND_DONE` frame naming the `&` jobs still running; it then stays their parent and
 * writes one `JOB_ENDED` frame per job as it ends. Frames are `\x1e<nonce>:BODY\x1f` on the original stderr, the
 * end marker `\x1e<nonce>:END\x1f` on the original stdout.
 */
export type CommandShell = 'bash' | 'sh';
export type CommandForm = 'foreground' | 'background';

/** Largest frame body the decoder accepts; the wrapper keeps the job list of `FOREGROUND_DONE` below it. */
export const MAX_CONTROL_FRAME_BODY_BYTES = 2048;
/** Characters of `FOREGROUND_DONE`'s pid list; jobs beyond it stay owned by the command's group, untracked. */
const MAX_JOB_LIST_CHARS = MAX_CONTROL_FRAME_BODY_BYTES - 32;

const frame = (nonce: string, body: string): string => `\\036${nonce}:${body}\\037`;

/**
 * Foreground form (bash only). fds 62/63 keep the original stdout/stderr for the wrapper, out of reach of the
 * user's redirections; the user's block runs with them closed, so the processes it starts do not inherit them
 * on bash 4+ (bash restores both after the block and before an EXIT trap; bash 3.2 leaks its saved copies).
 * The block starts with a no-op so an empty or comment-only command stays valid.
 */
const foregroundScript = (command: string, nonce: string): string => `exec 62>&1 63>&2
__ab_trap='{ __ab_rc=$?; builtin set +x; } 2>/dev/null; __ab_fg_end "$__ab_rc"'
__ab_status() { builtin return "$1"; }
__ab_fg_end() {
  __ab_rc=$1
  builtin set +e +u +o pipefail; builtin unset IFS; builtin trap - ERR DEBUG
  if builtin test -z "$__ab_ending"; then
    __ab_ending=1
    __ab_user_exit=$(builtin trap -p EXIT); builtin trap "$__ab_trap" EXIT
    case "$__ab_user_exit" in
      ''|*__ab_fg_end*) ;;
      *) __ab_run() { __ab_status "$__ab_rc"; builtin eval "$1"; }; builtin eval "__ab_run \${__ab_user_exit#trap -- }" ;;
    esac
  fi
  builtin trap - EXIT; builtin trap '' TERM
  # Wrapper output never reaches the user's stderr: when a signal ends the block, bash runs this from the EXIT
  # trap with fds 62/63 still closed (the frames are then lost, and the stop settles the call), and job status
  # lines would follow.
  {
    builtin unset -f jobs; __ab_pids=$(jobs -p); __ab_pids=$(builtin echo $__ab_pids)
    if builtin test \${#__ab_pids} -gt ${MAX_JOB_LIST_CHARS}; then __ab_pids=\${__ab_pids:0:${MAX_JOB_LIST_CHARS}}; __ab_pids=\${__ab_pids% *}; fi
    builtin printf '${frame(nonce, 'END')}' >&62
    builtin printf '${frame(nonce, 'FOREGROUND_DONE:%s:%s')}' "$__ab_rc" "$__ab_pids" >&63
    while builtin test -n "$__ab_pids"; do
      __ab_left=
      for __ab_p in $__ab_pids; do
        if builtin kill -0 "$__ab_p"; then __ab_left="$__ab_left $__ab_p"
        else builtin wait "$__ab_p"; builtin printf '${frame(nonce, 'JOB_ENDED:%s:%s')}' "$__ab_p" "$?" >&63; fi
      done
      __ab_pids=$__ab_left; builtin test -n "$__ab_pids" && builtin command sleep 0.1
    done
  } 2>/dev/null
  builtin exit "$__ab_rc"
}
builtin trap "$__ab_trap" EXIT
{ builtin :
${command}
} 62>&- 63>&-
{ __ab_rc=$?; builtin set +x; } 2>/dev/null
__ab_fg_end "$__ab_rc"
`;

/**
 * Background form (POSIX sh: bash and the \`sh\` fallback). The user's code runs only inside the job, so the
 * wrapper writes to its own stdout/stderr directly (POSIX shells such as dash accept single-digit fds only).
 * The job forwards TERM to its whole process group, so \`kill <pid>\` stops everything the command started.
 */
const backgroundScript = (command: string, nonce: string): string => `( trap 'trap - TERM; kill -TERM 0' TERM
  { :
${command}
  } & wait $!
) &
__ab_job=$!
trap '' TERM
printf '${frame(nonce, 'END')}'
printf '${frame(nonce, 'FOREGROUND_DONE:0:%s')}' "$__ab_job" >&2
wait "$__ab_job"; printf '${frame(nonce, 'JOB_ENDED:%s:%s')}' "$__ab_job" "$?" >&2
`;

export function wrapCommand(command: string, form: CommandForm, nonce: string): string {
  if (!/^[a-f0-9]{16,64}$/.test(nonce)) throw new Error('Command wrapper nonce must be hex');
  return form === 'foreground' ? foregroundScript(command, nonce) : backgroundScript(command, nonce);
}
