#!/bin/bash
# Runs autobyteus-541's new and changed web specs against the base's production code (80420a8bf6), then restores.
set -u
W="$(cd "$(dirname "$0")/../../../../../autobyteus-web" && pwd)"
TMP_DIR="$(mktemp -d)"
cd "$W"
FILES="stores/agentTeamRunStore.ts services/agentStreaming/TeamStreamingService.ts services/runOpen/teamRunOpenCoordinator.ts services/runOpen/agentRunOpenCoordinator.ts services/runSubmission/localUserSubmission.ts stores/runHistoryLoadActions.ts services/runStatus/agentRuntimeStatusState.ts components/workspace/team/TeamWorkspaceView.vue components/mobile/runScreen/MobileRunTargetView.vue components/agentInput/MessagePrimaryActionButton.vue types/agent/AgentContext.ts localization/messages/en/workspace.ts localization/messages/zh-CN/workspace.ts localization/messages/en/agentInput.generated.ts localization/messages/zh-CN/agentInput.generated.ts"
mkdir -p $TMP_DIR/backup
for f in $FILES; do mkdir -p "$TMP_DIR/backup/$(dirname $f)"; cp "$f" "$TMP_DIR/backup/$f"; git show "80420a8bf6:autobyteus-web/$f" > "$f"; done
NUXT_TEST=true npx vitest run \
  stores/__tests__/agentTeamRunStore.streamRecovery.spec.ts \
  services/runOpen/__tests__/teamStreamAutoRecovery.integration.spec.ts \
  services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts \
  services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts \
  stores/__tests__/runHistoryStore.spec.ts \
  components/workspace/team/__tests__/TeamWorkspaceView.spec.ts \
  components/mobile/runScreen/__tests__/MobileRunScreen.spec.ts \
  components/agentInput/__tests__/MessagePrimaryActionButton.spec.ts \
  services/runSubmission/__tests__/localUserSubmission.spec.ts \
  stores/__tests__/agentTeamRunStore.spec.ts > $TMP_DIR/red.log 2>&1
echo "vitest exit=$?" >> $TMP_DIR/red.log
for f in $FILES; do cp "$TMP_DIR/backup/$f" "$f"; done
git diff --stat -- $FILES | tail -1
echo "log: $TMP_DIR/red.log"
