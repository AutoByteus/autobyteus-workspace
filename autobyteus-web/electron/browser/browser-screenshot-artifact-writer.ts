import * as fs from 'fs/promises'
import * as path from 'path'

export class BrowserScreenshotArtifactWriter {
  constructor(private readonly baseDir: string) {}

  async write(buffer: Buffer, browserSessionId: string): Promise<string> {
    await fs.mkdir(this.baseDir, { recursive: true })
    const filePath = path.join(this.baseDir, `${browserSessionId}-${Date.now()}.png`)
    await fs.writeFile(filePath, buffer)
    return filePath
  }
}
