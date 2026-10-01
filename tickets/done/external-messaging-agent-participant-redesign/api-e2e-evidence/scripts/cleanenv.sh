#!/bin/bash
# Run a command with a scrubbed environment: no inherited AUTOBYTEUS_*/DATABASE_URL/APP_ENV/provider vars
# from the user's running AutoByteus app. Extra KEY=VALUE pairs may be passed before "--".
extra=()
while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do extra+=("$1"); shift; done
[ "$1" = "--" ] && shift
exec env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" SHELL=/bin/bash TMPDIR="${TMPDIR:-/tmp}" \
  LANG="${LANG:-en_US.UTF-8}" TERM=dumb \
  PATH="/Users/normy/.nvm/versions/node/v22.21.1/bin:/Users/normy/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
  "${extra[@]}" "$@"
