import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getCertificateInfo, verifyCertificate, CertificateError } from '../../../src/clients/cert-utils.js';

const resolveCertPath = (): string => {
  const candidates = [
    path.resolve(process.cwd(), '../autobyteus/clients/certificates/cert.pem'),
    path.resolve(process.cwd(), '../autobyteus/autobyteus/clients/certificates/cert.pem')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
};

describe('cert_utils', () => {
  it('loads certificate info from the bundled PEM', async () => {
    const certPath = resolveCertPath();
    const info = await getCertificateInfo(certPath);

    expect(info.certData.length).toBeGreaterThan(0);
    expect(info.fingerprint.length).toBeGreaterThan(0);
    expect(typeof info.subject).toBe('string');
    expect(typeof info.issuer).toBe('string');
  });

  it('throws CertificateError for missing cert', async () => {
    await expect(getCertificateInfo('missing-cert.pem')).rejects.toBeInstanceOf(CertificateError);
  });

  it('verifies fingerprint when certificate is valid', async () => {
    const certPath = resolveCertPath();
    const info = await getCertificateInfo(certPath);

    if (info.isValid) {
      const verified = await verifyCertificate(certPath, info.fingerprint);
      expect(verified.fingerprint).toBe(info.fingerprint);
    } else {
      await expect(verifyCertificate(certPath, info.fingerprint)).rejects.toBeInstanceOf(CertificateError);
    }
  });
});
