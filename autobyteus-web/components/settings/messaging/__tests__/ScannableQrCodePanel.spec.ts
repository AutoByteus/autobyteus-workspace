import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ScannableQrCodePanel from '../ScannableQrCodePanel.vue';

describe('ScannableQrCodePanel', () => {
  it('falls back to raw payload when QR text is empty', async () => {
    const wrapper = mount(ScannableQrCodePanel, {
      props: {
        qrCode: '   ',
        provider: 'WHATSAPP',
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="qr-render-error"]').text()).toContain('QR payload is empty.');
    expect(wrapper.get('[data-testid="qr-raw-payload"]').exists()).toBe(true);
  });

  it('shows rendering state while QR image is still being generated', async () => {
    const wrapper = mount(ScannableQrCodePanel, {
      props: {
        qrCode: 'qr-payload',
        provider: 'WHATSAPP',
      },
    });

    expect(wrapper.get('[data-testid="qr-rendering-state"]').exists()).toBe(true);
  });
});
