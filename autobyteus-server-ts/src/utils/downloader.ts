import fs from "node:fs";
import path from "node:path";

export async function downloadWithProgress(url: string, filePath: string, message: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const totalSize = Number(response.headers.get("content-length") ?? 0);
  const writer = fs.createWriteStream(filePath);
  await new Promise<void>((resolve, reject) => {
    writer.once("open", () => resolve());
    writer.once("error", reject);
  });

  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  let downloaded = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        writer.write(Buffer.from(value));
        downloaded += value.length;
        if (totalSize > 0) {
          const percent = Math.round((downloaded / totalSize) * 100);
          console.info(`${message} ${percent}%`);
        }
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      writer.once("finish", resolve);
      writer.once("error", reject);
      writer.end();
    });
  }
}
