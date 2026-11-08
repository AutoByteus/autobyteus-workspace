#!/bin/bash
# autobyteus-432 setup: from the app's node list (portrait), open the test node, create a draft run (no message is
# sent, so no model is called) and open its VNC Viewer. Leaves DevTools forwarded on tcp:9432.
A=$HOME/Library/Android/sdk/platform-tools/adb
DIR=$(cd "$(dirname "$0")" && pwd)
E="node $DIR/cdp-eval.mjs 9432"
# --page: the node's page is already open (no tap on the node list).
[ "$1" = "--page" ] || $A shell input tap 340 451
for i in $(seq 1 30); do
  PID=$($A shell pidof org.autobyteus.mobile | tr -d '\r')
  $A forward tcp:9432 localabstract:webview_devtools_remote_$PID >/dev/null 2>&1
  $E '!!document.querySelector("[data-testid=mobile-new-run-button]")' 2>/dev/null | grep -q true && break
  sleep 2
done
$E 'document.querySelector("[data-testid=mobile-new-run-button]").click(), "new run"' >/dev/null
sleep 2
$E 'document.querySelector("[data-testid=mobile-run-model-select-toggle]").click(), "model"' >/dev/null
sleep 2
$E '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].find(e=>e.textContent.includes("qwen/qwen3.6-35b-a3b:lmstudio")).click(), "chosen"' >/dev/null
sleep 1
$E 'document.querySelector("[data-testid=mobile-run-launch]").click(), "launch"' >/dev/null
sleep 4
$E 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), "menu"' >/dev/null
sleep 1
$E 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), "viewer"' >/dev/null
for i in $(seq 1 15); do
  $E 'document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent ?? ""' 2>/dev/null | grep -q 'Connected' && break
  sleep 1
done
bash "$DIR/state.sh" viewer-opened
