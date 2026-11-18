#!/usr/bin/env bash
# S3-05: a container stop during the data copy and a kill during the restore, with a 6 GB file in the
# data folder so each takes seconds; an in-container watcher marks the moment (low latency).
set -uo pipefail
source /tmp/ab305/proof/run-proof.sh
c=ab305-s3-e; cleanup "$c"
echo "# S3-05 a container stop during the data copy, a kill during the restore (6 GB data file)"
echo "# image: $IMG $(docker image inspect "$IMG" --format '{{.Id}}'); date: $(date -u +%Y-%m-%dT%H:%MZ)"; echo
start "$c" ab305-s3-e-sp ab305-s3-e-data
docker exec "$c" sh -c 'head -c 6000000000 /dev/urandom > /home/autobyteus/data/large-test-file'
size_before="$(docker exec "$c" stat -c %s /home/autobyteus/data/large-test-file)"
echo "## docker stop while data-copy.partial is being written (update to 1.5.13, which brings a migration)"
cli "$c" update --version 1.5.13 >/dev/null
docker exec "$c" sh -c 'while [ ! -d /home/autobyteus/server-packages/data-copy.partial ]; do sleep 0.05; done; sleep 1'
echo "at the stop: $(docker exec "$c" sh -c 'ls -d /home/autobyteus/server-packages/data-copy*; du -sh /home/autobyteus/server-packages/data-copy.partial | cut -f1') state.json $(docker exec "$c" cat /home/autobyteus/server-packages/state.json | tr -d ' \n')"
docker stop "$c" >/dev/null; docker start "$c" >/dev/null; wait_health "$c"
echo "after restart: $(snapshot "$c")"
echo "update: $(cli "$c" status | field update)"
echo "files: $(files "$c" | tr '\n' ' '); data file intact: $([[ "$(docker exec "$c" stat -c %s /home/autobyteus/data/large-test-file)" == "$size_before" ]] && echo yes || echo NO); table: $(db_has "$c" Test305_1_5_13)"
echo
echo "## docker kill during the restore (1.5.14 migrates, exits 30 s later, the rollback restores 6 GB)"
cli "$c" update --version 1.5.14 >/dev/null
docker exec "$c" sh -c 'while ! grep -q "\"step\": \"rollingBack\"" /home/autobyteus/server-packages/update.json; do sleep 0.05; done; sleep 0.5'
docker kill "$c" >/dev/null
echo "at the kill: state.json $(docker run --rm -v ab305-s3-e-sp:/sp --entrypoint cat "$IMG" /sp/state.json | tr -d ' \n')"
echo "at the kill: data folder $(docker run --rm -v ab305-s3-e-data:/d --entrypoint sh "$IMG" -c 'ls /d | tr "\n" " "; du -sh /d/large-test-file 2>/dev/null')"
docker start "$c" >/dev/null; wait_health "$c"
echo "after restart: $(snapshot "$c")"
echo "update: $(cli "$c" status | field update)"
echo "files: $(files "$c" | tr '\n' ' '); data file intact: $([[ "$(docker exec "$c" stat -c %s /home/autobyteus/data/large-test-file)" == "$size_before" ]] && echo yes || echo NO); table: $(db_has "$c" Test305_1_5_14)"
echo "starter log after the kill:"; docker exec "$c" grep -h '"starter"' /var/log/supervisor/autobyteus_server.log | tail -4
cleanup "$c"
