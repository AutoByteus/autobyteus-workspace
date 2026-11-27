#!/bin/bash
cd /tmp/661-api/rel
read PA PB < ports
for f in peers.json; do :; done
h() { docker exec 661-api-new-a sh -c 'sha256sum /home/autobyteus/data/remote-collaboration/peers.json /home/autobyteus/data/.env' | awk '{print $1}' | paste -sd ' ' -; }
B=$(h)
docker restart -t 30 661-api-new-a >/dev/null
for i in $(seq 1 150); do curl -sf -o /dev/null http://127.0.0.1:$PA/rest/health && break; sleep 2; done
A=$(h)
echo "peers.json + .env sha256 before restart: $B"
echo "peers.json + .env sha256 after restart:  $A"
[ "$B" = "$A" ] && echo "unchanged: yes" || echo "unchanged: NO"
docker cp -q 661-api-new-a:/home/autobyteus/data/db/production.db ledger-a2.db
echo "ledger after second start: $(sqlite3 ledger-a2.db "select migration_id, status, attempts from app_data_migration_records where migration_id='20261127_peers_to_node_keys';")"
echo "rows for that migration: $(sqlite3 ledger-a2.db "select count(*) from app_data_migration_records where migration_id like '%peers_to_node_keys%';")"
node gql.mjs secrets.json a '{ peerNodes { name paired relation } }'
