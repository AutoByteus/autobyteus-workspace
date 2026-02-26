import fs from 'node:fs/promises';
import { X509Certificate } from 'node:crypto';

export class CertificateError extends Error {}

type CertificateInfo = {
  subject: string;
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  fingerprint: string;
  isValid: boolean;
  daysUntilExpiry: number;
  certData: Buffer;
  cert: X509Certificate;
};

function parseDate(dateString: string): Date {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid certificate date: ${dateString}`);
  }
  return parsed;
}

export async function getCertificateInfo(certPath: string): Promise<CertificateInfo> {
  try {
    const certData = await fs.readFile(certPath);
    const cert = new X509Certificate(certData);

    const validFrom = parseDate(cert.validFrom);
    const validUntil = parseDate(cert.validTo);
    const now = new Date();
    const isValid = validFrom < now && now < validUntil;
    const daysUntilExpiry = Math.floor((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom,
      validUntil,
      fingerprint: cert.fingerprint256,
      isValid,
      daysUntilExpiry,
      certData,
      cert
    };
  } catch (error) {
    throw new CertificateError(`Failed to get certificate info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function verifyCertificate(
  certPath: string,
  expectedFingerprint?: string | null,
  warnExpiryDays: number = 30
): Promise<CertificateInfo> {
  try {
    const info = await getCertificateInfo(certPath);
    const now = new Date();

    if (!info.isValid) {
      if (now < info.validFrom) {
        throw new CertificateError('Certificate is not yet valid');
      }
      throw new CertificateError(
        `Certificate has expired on ${info.validUntil.toISOString().slice(0, 10)}`
      );
    }

    if (expectedFingerprint) {
      const expected = expectedFingerprint.replace(/\s+/g, '').toUpperCase();
      const actual = info.fingerprint.replace(/\s+/g, '');
      if (actual !== expected) {
        throw new CertificateError(
          `Certificate fingerprint mismatch. Expected: ${expected}\nGot: ${actual}`
        );
      }
      console.info('Certificate fingerprint verified successfully');
    } else {
      console.warn(
        'Certificate fingerprint verification skipped. Set AUTOBYTEUS_CERT_FINGERPRINT to enable this security feature. ' +
        `Current certificate fingerprint: ${info.fingerprint}`
      );
    }

    console.info(`Certificate valid from ${info.validFrom.toISOString()} to ${info.validUntil.toISOString()}`);
    console.info(`Certificate fingerprint (SHA256): ${info.fingerprint}`);
    console.info(`Certificate subject: ${info.subject}`);

    if (info.daysUntilExpiry <= warnExpiryDays) {
      console.warn(
        `Certificate will expire in ${info.daysUntilExpiry} days on ${info.validUntil.toISOString().slice(0, 10)}`
      );
    }

    return info;
  } catch (error) {
    if (error instanceof CertificateError) {
      throw error;
    }
    throw new CertificateError(
      `Certificate verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
