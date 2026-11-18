#!/bin/bash
# Usage: send.sh <controlPort> <tabId> <message file> [leave-hash]
# Types the message into the chat input of the instance window, sends it, and when a hash is given
# immediately moves the window to that page (the user leaves the run's view).
MSG=$(python3 -c 'import json,sys;print(json.dumps(open(sys.argv[1]).read().strip()))' "$3")
LEAVE=${4:-}
CHROME_REMOTE_DEBUGGING_PORT=$1 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser run-script --tab-id "$2" --script "async () => {
  const ta = document.querySelector('textarea');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, $MSG); ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  const send = document.querySelector('button[aria-label=\"Send message\"]') || [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||b.title||'').includes('Send message'));
  send.click();
  const sentAt = new Date().toISOString();
  if ('$LEAVE') { await new Promise(r => setTimeout(r, 1500)); location.hash = '$LEAVE'; }
  return { sentAt, leftTo: '$LEAVE' || null, url: location.href.split('#')[1] };
}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["result"])'
