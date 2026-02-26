import axios from 'axios';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

export const SSL_VERIFY_ENV_VAR = 'AUTOBYTEUS_DOWNLOAD_VERIFY_SSL';
export const SSL_CERT_FILE_ENV_VAR = 'AUTOBYTEUS_DOWNLOAD_SSL_CERT_FILE';

type SslOptions = {
  httpsAgent?: https.Agent;
};

function resolveSslOptions(): SslOptions {
  const certPath = process.env[SSL_CERT_FILE_ENV_VAR];
  if (certPath) {
    if (!fs.existsSync(certPath)) {
      throw new Error(`SSL cert file not found: ${certPath}`);
    }
    const cert = fs.readFileSync(certPath);
    return {
      httpsAgent: new https.Agent({ ca: cert })
    };
  }

  const verifyEnv = process.env[SSL_VERIFY_ENV_VAR];
  const verify = verifyEnv ? ['1', 'true', 'yes', 'on'].includes(verifyEnv.trim().toLowerCase()) : false;
  if (!verify) {
    return {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    };
  }

  return {};
}

export async function downloadFileFromUrl(url: string, filePath: string): Promise<void> {
  const targetDir = path.dirname(filePath);
  await fsPromises.mkdir(targetDir, { recursive: true });

  try {
    if (url.startsWith('data:')) {
      const [, encoded] = url.split(',', 2);
      if (!encoded) {
        throw new Error('Invalid data URI format');
      }
      const data = Buffer.from(encoded, 'base64');
      await fsPromises.writeFile(filePath, data);
      return;
    }

    if (fs.existsSync(url) && fs.statSync(url).isFile()) {
      await fsPromises.copyFile(url, filePath);
      return;
    }

    const sslOptions = resolveSslOptions();
    const response = await axios.get(url, {
      responseType: 'stream',
      ...sslOptions
    });

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      response.data.pipe(writeStream);
      response.data.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch {
      // ignore cleanup failures
    }
    throw error;
  }
}
