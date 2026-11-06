import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type RouterHistory, type Router } from 'vue-router';

/**
 * Memory history that records vue-router's `back` field as the browser's web history does (each entry knows the entry
 * under it; a replaced entry keeps it), so "is there an entry below" behaves as on the phone.
 */
const browserLikeMemoryHistory = (): RouterHistory => {
  const base = createMemoryHistory();
  return Object.create(base, {
    push: { value: (to: string, state: Record<string, unknown> = {}) => base.push(to, { ...state, back: base.location }) },
    replace: { value: (to: string, state: Record<string, unknown> = {}) => base.replace(to, { ...state, back: base.state.back ?? null }) },
  }) as RouterHistory;
};

/** A router with `/mobile` only, as the phone's page, entered fresh (no entry under the first one). */
export const createMobileTestRouter = async (query: Record<string, string> = {}): Promise<Router> => {
  const router = createRouter({ history: browserLikeMemoryHistory(), routes: [{ path: '/mobile', component: { render: () => h('div') } }] });
  await router.replace({ path: '/mobile', query });
  await router.isReady();
  return router;
};

/** Runs a composable inside a component that has the router (and the given plugins). */
export const withSetup = <T>(router: Router, setup: () => T, plugins: unknown[] = []): { result: T; unmount: () => void } => {
  let result!: T;
  const wrapper = mount(defineComponent({ setup() { result = setup(); return () => h('div'); } }), { global: { plugins: [router, ...plugins] as never[] } });
  return { result, unmount: () => wrapper.unmount() };
};
