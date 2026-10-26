#!/bin/bash
# Plays the agent's shell: it has only the proxy URL (with its run capability), never the token.
PROXY="$1"; BADCAP="$2"
echo "1. token in my environment? -> $(env | grep -c dummy-gh-token) matches"
echo "2. GET /user via proxy -> $(curl -s -w ' [HTTP %{http_code}]' "$PROXY/user")"
echo "3. forged Authorization header -> $(curl -s -o /dev/null -w 'HTTP %{http_code}' -H 'Authorization: Bearer stolen-attempt' "$PROXY/user") (proxy replaces it)"
echo "4. POST outside the allow-list -> $(curl -s -w ' [HTTP %{http_code}]' -X POST "$PROXY/repos/o/r/delete")"
echo "5. another run's capability -> $(curl -s -w ' [HTTP %{http_code}]' "$BADCAP/user")"
echo "6. git over HTTPS rewritten to the proxy:"
git -c url."$PROXY/".insteadOf=https://github.com/ ls-remote https://github.com/owner/repo.git 2>&1 | head -2 | sed 's/^/     /'
