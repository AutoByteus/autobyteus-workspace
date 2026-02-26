import QRCode from 'qrcode';

export async function toQrCodeDataUrl(qrText: string): Promise<string> {
  const normalizedQrText = qrText.trim();
  if (!normalizedQrText) {
    throw new Error('QR payload is empty.');
  }

  const svgMarkup = await QRCode.toString(normalizedQrText, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
  });

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}
