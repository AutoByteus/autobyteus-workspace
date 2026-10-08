import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

/** How long after the panel appears its open run's row may still be brought into view. */
export const REVEAL_WINDOW_MS = 3000;
/** Selected rows (Agent run, task child, Team member incl. sub-team, Org row); the last one is the deepest. */
const SELECTED_ROW_SELECTOR = '[aria-current="true"], [aria-selected="true"]';
/** The panel's Workspaces section, focused when the panel was opened from the strip's Workspaces icon. */
const RUN_HISTORY_SECTION_SELECTOR = '[data-test="app-left-panel-run-history"]';
const USER_TAKEOVER_EVENTS = ['wheel', 'pointerdown', 'keydown'] as const;

/**
 * When the tree panel appears (docked expand, drawer open, app start), brings the open run's row
 * into view as its rows load: a row that is fully visible does not move; otherwise it is centred,
 * instantly. If focus is on the Workspaces section, it moves onto the row. The window closes at the
 * first wheel, press or key in the tree, after REVEAL_WINDOW_MS, or when the panel unmounts.
 * It only scrolls and focuses; expansion and selection belong to the tree state.
 *
 * `runShown` is the shell's "a run is shown in the center" signal (`isWorkspacesActive`). Off a run
 * (New chat, other pages) a row can still carry an earlier selection; it is then neither scrolled to
 * nor focused, and focus stays on the Workspaces section (REQ-006, REQ-009).
 */
export const useRevealSelectedTreeRow = (
  container: Ref<HTMLElement | null>,
  runShown: Readonly<Ref<boolean>>,
): void => {
  let observer: MutationObserver | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  let frame = 0;
  let listeningOn: HTMLElement | null = null;

  const close = (): void => {
    observer?.disconnect();
    observer = null;
    if (deadline !== null) clearTimeout(deadline);
    deadline = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    USER_TAKEOVER_EVENTS.forEach((type) => listeningOn?.removeEventListener(type, close));
    listeningOn = null;
  };

  const reveal = (): void => {
    frame = 0;
    if (!runShown.value) return;
    const scroller = container.value;
    const rows = scroller?.querySelectorAll<HTMLElement>(SELECTED_ROW_SELECTOR);
    const row = rows?.length ? rows[rows.length - 1] : null;
    if (!scroller || !row) return;
    const box = scroller.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    if (rect.top < box.top || rect.bottom > box.bottom) {
      scroller.scrollTop += (rect.top - box.top) - (box.height - rect.height) / 2;
    }
    if (document.activeElement?.matches(RUN_HISTORY_SECTION_SELECTOR)) {
      row.focus({ preventScroll: true });
    }
    // The window stays open: rows that load later above this one can push it out again.
  };

  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(reveal);
  };

  // A run that becomes shown during the window (e.g. its context registers) is revealed then.
  watch(runShown, (shown) => { if (shown && observer) schedule(); });

  onMounted(() => {
    const scroller = container.value;
    if (!scroller) return;
    listeningOn = scroller;
    USER_TAKEOVER_EVENTS.forEach((type) => scroller.addEventListener(type, close, { passive: true }));
    observer = new MutationObserver(schedule);
    observer.observe(scroller, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-current', 'aria-selected'],
    });
    deadline = setTimeout(close, REVEAL_WINDOW_MS);
    schedule();
  });

  onBeforeUnmount(close);
};
