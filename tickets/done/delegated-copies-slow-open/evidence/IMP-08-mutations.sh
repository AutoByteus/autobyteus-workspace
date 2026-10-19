#!/bin/bash
# Each mutation removes one mechanism; the named specs must FAIL; the file is restored from git afterwards.
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/autobyteus-web || exit 99
mutate() { # name file python-old python-new specs...
  local name="$1" file="$2" old="$3" new="$4"; shift 4
  echo "=== $name"
  echo "    file: $file"
  python3 - "$file" "$old" "$new" <<'PY'
import sys
p, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p).read()
assert s.count(old) == 1, f"mutation anchor not unique in {p}"
open(p, 'w').write(s.replace(old, new))
PY
  pnpm test:nuxt --run "$@" 2>&1 | perl -pe 's/\e\[[0-9;]*[A-Za-z]//g' | grep -E "^\s+×|Tests  " | sed 's/^/    /'
  git checkout -- "$file"
  if git diff --quiet -- "$file"; then echo "    restored: yes"; else echo "    restored: NO"; fi
}
mutate "M1 no isPublished check after the fetch (AR-001 supersession)" services/agentCollaboration/agentRunCollaborationChildHydration.ts \
  $'    if (!input.isPublished()) return \'superseded\'\n    if (agent.state.eventMonitorPresentationRevision' \
  $'    if (agent.state.eventMonitorPresentationRevision' \
  services/agentCollaboration/__tests__/agentRunCollaborationChildHydration.spec.ts stores/__tests__/agentRunCollaborationLazyChildren.spec.ts
mutate "M2 no pending-input overlay on load (REQ-006 preserved pending input)" services/agentCollaboration/agentRunCollaborationChildHydration.ts \
  $'    overlayPendingUserMessages(conversation, agent.state.conversation)\n' '' \
  services/agentCollaboration/__tests__/agentRunCollaborationChildHydration.spec.ts
mutate "M3 carry-over keeps the old pending markers (D-4 carry-over)" services/agentCollaboration/agentRunCollaborationContext.ts \
  $'          for (const message of conversation.messages) if (message.type === \'user\') delete message.pendingInput\n          overlayPendingUserMessages(conversation, next.state.conversation)\n' '' \
  services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts
mutate "M4 no load for the selected child after publication (D-4)" stores/agentRunCollaborationStore.ts \
  $'    returnToHostWhenUnlisted(hostRunId, context)\n    ensureChildHydrated(hostRunId, selection[hostRunId] ?? null)\n' \
  $'    returnToHostWhenUnlisted(hostRunId, context)\n' \
  stores/__tests__/agentRunCollaborationLazyChildren.spec.ts
mutate "M5 dedupe not keyed by context (one Map for all contexts; AR-001 / D-5)" stores/agentRunCollaborationStore.ts \
  $'    const loads = childLoads.get(context) ?? new Map<string, Promise<void>>()\n    childLoads.set(context, loads)' \
  $'    const loads = ((globalThis as any).__sharedLoads ??= new Map<string, Promise<void>>())' \
  stores/__tests__/agentRunCollaborationLazyChildren.spec.ts
git status --porcelain --untracked-files=no
