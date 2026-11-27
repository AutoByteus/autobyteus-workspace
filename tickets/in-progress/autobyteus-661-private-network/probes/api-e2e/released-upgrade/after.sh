#!/bin/bash
cd /tmp/661-api/rel
for n in a b c; do node snapshot.mjs 661-api-new-$n upgraded-$n; done > upgraded-snapshot.json
for n in a b c; do echo "== $n migration log lines"; docker logs 661-api-new-$n 2>&1 | grep -iE "peers_to_node_keys|peers-to-node-keys|app.data.migration|migration.*(succeeded|failed|warning)" | head -8; done
for n in a b c; do echo "$n peerNodes: $(node gql.mjs secrets.json $n '{ peerNodes { nodeId name address relation paired } }')"; done
