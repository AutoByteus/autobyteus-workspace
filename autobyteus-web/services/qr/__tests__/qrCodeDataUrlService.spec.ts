import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toDataUrlMock } = vi.hoisted(() => ({
  toDataUrlMock: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: {
    toString: toDataUrlMock,
  },
}));

import { toQrCodeDataUrl } from '~/services/qr/qrCodeDataUrlService';

describe('toQrCodeDataUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes QR payload into data URL with deterministic options', async () => {
    toDataUrlMock.mockResolvedValue('<svg id=\"qr\" />');

    const result = await toQrCodeDataUrl('  qr-text  ');

    expect(result).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%20id%3D%22qr%22%20%2F%3E');
    expect(toDataUrlMock).toHaveBeenCalledWith('qr-text', {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
    });
  });

  it('rejects empty QR payload before calling qrcode library', async () => {
    await expect(toQrCodeDataUrl('   ')).rejects.toThrow('QR payload is empty.');
    expect(toDataUrlMock).not.toHaveBeenCalled();
  });

  it('propagates encoding errors from qrcode library', async () => {
    toDataUrlMock.mockRejectedValue(new Error('encode failed'));

    await expect(toQrCodeDataUrl('qr-text')).rejects.toThrow('encode failed');
  });
});
