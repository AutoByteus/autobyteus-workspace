/** Framed stderr control is independent of user newline boundaries. */
export const WSL_COMMAND_ANCHOR_SCRIPT = String.raw`
nonce=$1; shift
trap ':' TERM
frame() { printf '\036%s:%s\037' "$nonce" "$1" >&2; }
frame "READY:$$"
IFS= read -r control || exit 1
[ "$control" = "$nonce:START" ] || exit 1
"$@" </dev/null &
command_pid=$!
frame "STARTED:$command_pid"
while :; do
  wait "$command_pid"
  code=$?
  if kill -0 "$command_pid" 2>/dev/null; then continue; fi
  break
done
frame "RESULT:$code"
while :; do
  if IFS= read -r control; then
    [ "$control" = "$nonce:RELEASE" ] && exit 0
  else
    code=$?
    [ "$code" -gt 128 ] && continue
    exit 1
  fi
done
`;
