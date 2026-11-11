#!/bin/bash
# autobyteus-471 API/E2E harness: the real docker CLI, except any command naming the user's node containers or their
# volumes is refused unless it only reads (ps, inspect, port). Every call is recorded.
REAL=/usr/local/bin/docker
printf '%s\0' "$@" >> /tmp/abtest471/docker-calls.nul; printf '\n' >> /tmp/abtest471/docker-calls.nul
for a in "$@"; do
  case "$a" in
    autobyteus-server-0|autobyteus-server-1|autobyteus-server-2|autobyteus-server-0-*|autobyteus-server-1-*|autobyteus-server-2-*)
      if [[ "$1" != ps && "$1" != inspect && "$1" != port ]]; then echo "abtest471 guard: refusing '$1' on $a" >&2; exit 97; fi ;;
  esac
done
exec "$REAL" "$@"
