#!/bin/bash
# autobyteus-522 API/E2E (temporary): a fresh Phone Access pairing session on the test node (for http://10.0.2.2:<port>), shared
# into the app at once (ACTION_SEND). The link is written to /tmp/abtest522/pairing-link.txt only and never printed.
ADB=$HOME/Library/Android/sdk/platform-tools/adb
node --input-type=module -e "
const st = JSON.parse((await import('node:fs')).readFileSync('/tmp/abtest522/state.json', 'utf8'));
const r = await fetch(st.base + '/rest/remote-access/pairing-sessions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + st.owner },
  body: JSON.stringify({ connectionWay: 'local_network', serverBaseUrl: 'http://10.0.2.2:' + st.port, serverName: 'Test Node 522', trustedPrivateHttpAcknowledged: true }) });
const b = await r.json(); if (r.status !== 201 || !b.mobileUrl) { console.log('pairing session', r.status); process.exit(1); }
(await import('node:fs')).writeFileSync('/tmp/abtest522/pairing-link.txt', b.mobileUrl); console.log('pairing session 201');
" || exit 1
LINK=$(cat /tmp/abtest522/pairing-link.txt)
"$ADB" -s emulator-5640 shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "'$LINK'" -n org.autobyteus.mobile/.MainActivity > /dev/null 2>&1
echo "pairing link shared"
