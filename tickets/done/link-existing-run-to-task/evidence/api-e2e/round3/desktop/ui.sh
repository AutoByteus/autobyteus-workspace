#!/bin/bash
# UI actions on one isolated instance (attach-only). Usage: ui.sh <cdpPort> expand|open|openrow|say|sidebar <text>
D="$(cd "$(dirname "$0")" && pwd)"; P="$1"; A="$2"; T="$3"
J=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$T")
case "$A" in
  expand) $D/b.sh $P js "(() => { const el = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.trim() === $J); if (!el) return 'missing'; let n = el; while (n && n.tagName !== 'BUTTON') n = n.parentElement; if (n && n.getAttribute('aria-expanded') === 'false') n.click(); return 'ok'; })()" ;;
  open) $D/b.sh $P js "(() => { const el = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.trim().startsWith($J)); if (!el) return 'missing'; let n = el; for (let i=0;i<6 && n && n.tagName!=='BUTTON'; i++) n = n.parentElement; (n||el).click(); return 'ok'; })()" ;;
  openrow) $D/b.sh $P js "(() => { const el = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.trim() === $J); if (!el) return 'missing'; el.closest('[role=treeitem]').click(); return 'ok'; })()" ;;
  say) $D/b.sh $P js "window.__ADO_TEXT__ = $J; $(cat $D/type.js)" >/dev/null; $D/b.sh $P js "(() => { const t = document.querySelector('textarea'); if (!t || !t.value) return 'empty'; t.focus(); t.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true})); return new Date().toISOString(); })()" ;;
  sidebar) $D/b.sh $P text | sed -n '/workspace-ado/,/Settings/p' | tr '\n' '|' ;;
esac
