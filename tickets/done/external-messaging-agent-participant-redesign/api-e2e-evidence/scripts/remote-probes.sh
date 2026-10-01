#!/bin/sh
H=${1:-host.docker.internal}; P=${2:-18741}
BODY='{"provider":"TELEGRAM","transport":"BUSINESS_API","accountId":"e2e-bot","peerId":"e2e-peer-1001","peerType":"USER","externalMessageId":"remote-probe-1","content":"hi","attachments":[],"receivedAt":"2026-09-24T15:00:00.000Z","metadata":{}}'
probe(){ label=$1; shift; code=$(curl -s -o /tmp/b.txt -w "%{http_code}" "$@"); printf "%-66s -> HTTP %s  body=%s\n" "$label" "$code" "$(head -c 150 /tmp/b.txt)"; }
echo "client source address as seen from container: $(hostname -i 2>/dev/null)"
probe "remote POST /rest/api/channel-ingress/v1/messages (no auth)" -X POST -H 'content-type: application/json' -d "$BODY" http://$H:$P/rest/api/channel-ingress/v1/messages
probe "remote POST /rest/api/channel-ingress/v1/delivery-events (no auth)" -X POST -H 'content-type: application/json' -d '{}' http://$H:$P/rest/api/channel-ingress/v1/delivery-events
probe "remote POST /rest/api/never-existed (no auth, control)" -X POST -H 'content-type: application/json' -d '{}' http://$H:$P/rest/api/never-existed
probe "remote POST /rest/api/channel-ingress/v1/messages (invalid mobile cred)" -X POST -H 'authorization: Bearer mra_invalid_e2e' -H 'content-type: application/json' -d "$BODY" http://$H:$P/rest/api/channel-ingress/v1/messages
probe "remote POST /rest/api/channel-ingress/v1/delivery-events (invalid mobile cred)" -X POST -H 'authorization: Bearer mra_invalid_e2e' -H 'content-type: application/json' -d '{}' http://$H:$P/rest/api/channel-ingress/v1/delivery-events
probe "remote POST /graphql (invalid mobile cred, protected control)" -X POST -H 'authorization: Bearer mra_invalid_e2e' -H 'content-type: application/json' -d '{"query":"{ __typename }"}' http://$H:$P/graphql
probe "remote POST /rest/api/never-existed (invalid mobile cred, control)" -X POST -H 'authorization: Bearer mra_invalid_e2e' -H 'content-type: application/json' -d '{}' http://$H:$P/rest/api/never-existed
probe "remote GET /rest/health (invalid mobile cred, public control)" -H 'authorization: Bearer mra_invalid_e2e' http://$H:$P/rest/health
