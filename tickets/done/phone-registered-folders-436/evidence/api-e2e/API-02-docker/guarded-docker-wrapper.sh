#!/bin/bash
# autobyteus-436 API-02 test harness: the real docker CLI, except
# - `pull abtest436/...` is a no-op (the test image exists only locally);
# - any command naming the user's node containers or their volumes is refused (they are never touched).
REAL=/usr/local/bin/docker
printf '%s\0' "$@" >> /tmp/abtest436/docker-calls.nul; printf '\n' >> /tmp/abtest436/docker-calls.nul
if [[ "$1" == pull && "$2" == abtest436/* ]]; then echo "abtest436: $2 is a local test image"; exit 0; fi
for a in "$@"; do
  case "$a" in
    autobyteus-server-0|autobyteus-server-1|autobyteus-server-2|autobyteus-server-0-*|autobyteus-server-1-*|autobyteus-server-2-*)
      if [[ "$1" != ps && "$1" != inspect && "$1" != port ]]; then echo "abtest436 guard: refusing '$1' on $a" >&2; exit 97; fi ;;
  esac
done
exec "$REAL" "$@"
