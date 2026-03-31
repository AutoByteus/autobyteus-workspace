import * as fs from 'fs/promises'
import * as path from 'path'

export class PreviewScreenshotArtifactWriter {
  constructor(private readonly baseDir: string) {}

  async write(buffer: Buffer, previewSessionId: string): Promise<string> {
    await fs.mkdir(this.baseDir, { recursive: true })
    const filePath = path.join(this.baseDir, `${previewSessionId}-${Date.now()}.png`)
    await fs.writeFile(filePath, buffer)
    return filePath
  }
}
