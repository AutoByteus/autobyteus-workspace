import { getCurrentScope, nextTick, onScopeDispose, readonly, ref, type Ref } from 'vue';
import type { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import type { useMobileRunOpening } from '~/composables/mobile/useMobileRunOpening';
import type { useMobileRunTree } from '~/composables/mobile/useMobileRunTree';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { agentRunIdOfRowKey } from '~/utils/runListProjection';

/** A delegated row of an agent run, `agent:<hostRunId>/<rowKey>`: its row exists once the host's view is published. */
const delegatedHostOf = (key: string): string | null => {
  const slash = key.indexOf('/');
  return slash > 0 ? agentRunIdOfRowKey(key.slice(0, slash)) : null;
};

/**
 * The page-start restore of the open subject (autobyteus-435 REQ-005, DS-006): a reload, or Android's restore after it
 * ended the app, starts the page on a screen whose route names a run list `row` but whose subject is not open. One shot,
 * created in the shell's setup:
 *
 * 1. `restoring` is set at once, and the pending open begins, so the screen says "Opening…" (DEC-015) and nothing
 *    replaces it with the list before the restore decides.
 * 2. It waits for the page's first check (its history read included); a failed history read shows the list with its
 *    connection state (DEC-014).
 * 3. The row's readiness by its kind: a top-level run or Team row is in the history read; a Team member's row is in its
 *    Team's rows (revealed); a delegated row needs its host's view, read once unless published (a failed read: the
 *    list, DEC-014).
 * 4. The row found: it reopens with the same shared action as a tap (no navigation). 5. Not found: the subject is gone,
 *    the list. Every exit ends `restoring`; no timer: each wait ends on a read's own settle.
 *
 * A tap, Back, or the shell's end (the session rejected at the first check) supersedes it: it then acts no more.
 */
export function useMobileSubjectRestore(input: {
  tree: ReturnType<typeof useMobileRunTree>;
  opening: ReturnType<typeof useMobileRunOpening>;
  navigation: ReturnType<typeof useMobileNavigation>;
  /** Settles when the page's first check (the credential check and the first history read) has ended. */
  firstCheck: Promise<void>;
}): { restoring: Readonly<Ref<boolean>> } {
  const { tree, opening, navigation } = input;
  const pendingOpen = useMobileRunOpeningStore();
  const history = useRunHistoryStore();
  const collaboration = useAgentRunCollaborationStore();
  const key = navigation.openRowKey.value;
  const screen = navigation.screen.value;
  const restoring = ref(Boolean(key) && screen !== 'list' && screen !== 'new' && !useActiveContextStore().activeWorkspaceTarget);
  if (!restoring.value || !key) return { restoring: readonly(restoring) };

  pendingOpen.begin(key);
  let disposed = false;
  if (getCurrentScope()) onScopeDispose(() => { disposed = true; pendingOpen.cancel(key); restoring.value = false; });
  /** Still this restore's: the shell is mounted, the route still names the row on a run screen, and no tap superseded it. */
  const isCurrent = (): boolean => !disposed && pendingOpen.pending?.key === key
    && navigation.openRowKey.value === key && navigation.screen.value !== 'list';
  const toList = async (): Promise<void> => {
    await navigation.toList();
    pendingOpen.cancel(key);
  };

  void (async () => {
    try {
      await input.firstCheck;
      // A rejected session unmounts the shell in the next render; nothing is done under the pairing screen.
      await nextTick();
      if (!isCurrent()) return;
      if (history.error) return await toList();
      const host = delegatedHostOf(key);
      if (host && !collaboration.contextFor(host)) {
        await collaboration.inspect(host);
        if (!isCurrent()) return;
        if (collaboration.errors[host]) return await toList();
      }
      tree.revealRow(key);
      const row = tree.rows.value.find((candidate) => candidate.key === key);
      if (!row?.open) return await toList();
      // The shared action commits the open (the subject's screen shows) or fails it (the run screen goes back).
      await opening.reopen({ ...row, open: row.open });
    } finally {
      restoring.value = false;
      // Superseded by Back while it waited, its pending open still this one's: it ends here.
      if (!disposed && pendingOpen.pending?.key === key) pendingOpen.cancel(key);
    }
  })();

  return { restoring: readonly(restoring) };
}
