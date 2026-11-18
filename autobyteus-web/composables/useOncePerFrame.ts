import { onBeforeUnmount } from 'vue';

/**
 * Runs `check` at most once per animation frame, after that frame's DOM work, however often it is requested
 * (autobyteus-358: a layout read on every component update made a large conversation open in minutes). The pending
 * frame does nothing once the component has unmounted. Without `requestAnimationFrame` (tests) it runs at once.
 */
export const useOncePerFrame = (check: () => void): (() => void) => {
  let pending = false;
  let unmounted = false;
  onBeforeUnmount(() => { unmounted = true; });
  return () => {
    if (pending || unmounted) return;
    if (typeof requestAnimationFrame !== 'function') { check(); return; }
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!unmounted) check();
    });
  };
};
