import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingSetupNavigationStore } from '~/stores/messagingSetupNavigationStore';

describe('messagingSetupNavigationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stores selection by provider when step is valid', () => {
    const store = useMessagingSetupNavigationStore();

    const selected = store.setSelectedStep(
      'WHATSAPP',
      'binding',
      ['gateway', 'personal_session', 'binding', 'verification'],
    );

    expect(selected).toBe(true);
    expect(store.selectedStepForProvider('WHATSAPP')).toBe('binding');
  });

  it('rejects invalid step for provider order', () => {
    const store = useMessagingSetupNavigationStore();

    const selected = store.setSelectedStep(
      'DISCORD',
      'personal_session',
      ['gateway', 'binding', 'verification'],
    );

    expect(selected).toBe(false);
    expect(store.selectedStepForProvider('DISCORD')).toBeNull();
  });

  it('clears selected step for provider', () => {
    const store = useMessagingSetupNavigationStore();
    store.setSelectedStep(
      'WECHAT',
      'personal_session',
      ['gateway', 'personal_session', 'binding', 'verification'],
    );

    store.clearSelectedStep('WECHAT');

    expect(store.selectedStepForProvider('WECHAT')).toBeNull();
  });
});
