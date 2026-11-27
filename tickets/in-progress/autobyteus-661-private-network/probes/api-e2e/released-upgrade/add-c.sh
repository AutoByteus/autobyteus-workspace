#!/bin/bash
set -e
cd /tmp/661-api/rel
docker volume create 661-api-rel-c-data >/dev/null
PC=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])")
echo $PC > port-c
docker run -d --name 661-api-rel-c -e AUTOBYTEUS_SERVER_HOST=http://localhost:$PC -p 127.0.0.1:$PC:8000 -v 661-api-rel-c-data:/home/autobyteus/data autobyteus/autobyteus-server:beta >/dev/null
for i in $(seq 1 120); do curl -sf -o /dev/null http://127.0.0.1:$PC/rest/health && break; sleep 2; done
node creds.mjs secrets.json "c,661-api-rel-c,http://127.0.0.1:$PC"
node gql.mjs secrets.json c 'mutation { setRemoteCollaborationEnabled(enabled: true) { __typename } }' >/dev/null
node gql.mjs secrets.json a 'mutation { createPeerInvite { inviteText } }' > invite.json
INV=$(python3 -c "import json;print(json.load(open('invite.json'))['data']['createPeerInvite']['inviteText'])")
rm -f invite.json
node gql.mjs secrets.json c 'mutation($t:String!){ acceptPeerInvite(inviteText:$t, name:"node-a", nameOnInviter:"node-c"){ nodeId name baseUrl paired } }' "{\"t\":\"$INV\"}"
for n in a b c; do echo "$n: $(node gql.mjs secrets.json $n '{ peerNodes { name baseUrl paired } }')"; done
A=$(node gql.mjs secrets.json b '{ peerNodes { nodeId } }' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['peerNodes'][0]['nodeId'])")
echo "released b->a availability: $(node gql.mjs secrets.json b "query{ peerNodeAvailability(nodeId:\"$A\"){ available refusalCode } }")"
