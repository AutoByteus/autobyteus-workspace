import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/**
 * The iPad's landscape layout (autobyteus-279, REQ-008, UI spec Responsive And Platform Behavior): at 1024 CSS px and
 * wider the run list is a 380 px pane beside what is open, as iPad apps do; narrower screens (a phone, an iPad in
 * portrait) show one screen at a time. It follows the viewport width, never the user agent (iPad's web view reports a
 * desktop Mac). The value changes as the device rotates; navigation state does not, so the open run stays open.
 */
export const MOBILE_SPLIT_QUERY = '(min-width: 1024px)';

export const useMobileSplitLayout = (): Readonly<Ref<boolean>> => {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_SPLIT_QUERY) : null;
  const split = ref(query?.matches ?? false);
  const onChange = (event: MediaQueryListEvent): void => { split.value = event.matches; };
  onMounted(() => query?.addEventListener('change', onChange));
  onBeforeUnmount(() => query?.removeEventListener('change', onChange));
  return split;
};
