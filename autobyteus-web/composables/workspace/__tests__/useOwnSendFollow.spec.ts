// DC-007 (autobyteus-279, REQ-009): only a new message of your own, while the feed shows the latest, follows.
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { useOwnSendFollow } from '../useOwnSendFollow';

const setup = (latest = true) => {
  const state = reactive({ messages: [{ type: 'ai' }] as Array<{ type: string }>, latest });
  const follow = vi.fn();
  mount(defineComponent({ setup() { useOwnSendFollow(() => state.messages, () => state.latest, follow); return () => h('div'); } }));
  return { state, follow };
};

describe('useOwnSendFollow', () => {
  it('follows a new message of your own', async () => {
    const { state, follow } = setup();
    state.messages.push({ type: 'user' });
    await nextTick();
    expect(follow).toHaveBeenCalledTimes(1);
  });

  it('does not follow a reply or a message from another agent', async () => {
    const { state, follow } = setup();
    state.messages.push({ type: 'ai' });
    await nextTick();
    expect(follow).not.toHaveBeenCalled();
  });

  it('does not move a feed that shows an earlier page', async () => {
    const { state, follow } = setup(false);
    state.messages.push({ type: 'user' });
    await nextTick();
    expect(follow).not.toHaveBeenCalled();
  });
});
