import { computed, ref, shallowRef, watch, type Ref } from 'vue';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { fetchNodeDesktop } from '~/utils/nodeDesktopClient';

export type NodeDesktopAvailability = 'loading' | 'available' | 'unavailable' | 'error';

/** One answer per node (by its REST base), shared by every viewer of this window. */
const availabilityByNode = new Map<string, Ref<NodeDesktopAvailability>>();

const load = async (state: Ref<NodeDesktopAvailability>): Promise<void> => {
  state.value = 'loading';
  try {
    const { available } = await fetchNodeDesktop(useWindowNodeContextStore().getBoundEndpoints());
    state.value = available ? 'available' : 'unavailable';
  } catch (error) {
    console.warn('[node desktop] could not ask the node for its node desktop:', error);
    state.value = 'error';
  }
};

/**
 * Whether the bound node has a node desktop (`GET /rest/node-desktop`): the one client-side owner of
 * that answer. The first caller for a node asks it; later callers share an answer the node gave
 * (`available` / `unavailable`). An `error` is not an answer: the next caller asks again, so a node
 * that was briefly unreachable does not hide the desktop for the page's life. `reload` asks again
 * (Retry after an error).
 */
export function useNodeDesktopAvailability() {
  const nodeContext = useWindowNodeContextStore();
  const rest = computed(() => nodeContext.getBoundEndpoints().rest);

  const stateFor = (node: string): Ref<NodeDesktopAvailability> => {
    let state = availabilityByNode.get(node);
    if (!state) {
      state = ref<NodeDesktopAvailability>('loading');
      availabilityByNode.set(node, state);
      void load(state);
    } else if (state.value === 'error') {
      void load(state);
    }
    return state;
  };

  // Held in an object: a ref given to `shallowRef` would be returned as is, not wrapped.
  const current = shallowRef<{ state: Ref<NodeDesktopAvailability> }>({ state: stateFor(rest.value) });
  watch(rest, (node) => { current.value = { state: stateFor(node) }; });

  const availability = computed(() => current.value.state.value);
  const reload = () => load(current.value.state);

  return { availability, reload };
}
