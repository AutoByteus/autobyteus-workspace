import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import toIco from 'to-ico'

interface IconGenerationSize {
  size: number
  filename: string
}

export async function generateIcons(): Promise<void> {
  console.log('Generating application icons...')
  const sizes: IconGenerationSize[] = [
    { size: 16, filename: '16x16.png' },
    { size: 32, filename: '32x32.png' },
    { size: 48, filename: '48x48.png' },
    { size: 64, filename: '64x64.png' },
    { size: 128, filename: '128x128.png' },
    { size: 256, filename: '256x256.png' },
    { size: 512, filename: '512x512.png' },
    { size: 1024, filename: '1024x1024.png' }
  ]
  
  const source: string = path.join(__dirname, '..', '..', 'public/autobyteus-icon.svg')
  const targetDir: string = path.join(__dirname, '..', 'icons')
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  
  try {
    // Generate PNG icons
    for (const { size, filename } of sizes) {
      console.log(`Generating ${size}x${size} PNG icon...`)
      await sharp(source)
        .resize(size, size)
        .png()
        .toFile(path.join(targetDir, filename))
    }
    
    // Generate ICO file for Windows using to-ico
    // For ICO, we'll use multiple resolutions (16, 32, 48, 256)
    console.log('Generating Windows ICO icon...')
    const icoPngFiles = [16, 32, 48, 256].map(size => 
      path.join(targetDir, `${size}x${size}.png`)
    )
    
    // Wait for all required PNGs to be loaded
    const pngBuffers = await Promise.all(
      icoPngFiles.map(file => fs.promises.readFile(file))
    )
    
    // Convert PNGs to ICO format
    const icoBuffer = await toIco(pngBuffers, {
      sizes: [16, 32, 48, 256],
      resize: true
    })
    
    // Save the ICO file
    await fs.promises.writeFile(path.join(targetDir, 'icon.ico'), icoBuffer)
    
    // Generate ICNS file for macOS
    console.log('Generating macOS ICNS icon...')
    await sharp(source)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(targetDir, 'icon.icns'))
      
    console.log('Icon generation completed successfully')
  } catch (error) {
    console.error('Error generating icons:', error)
    throw error
  }
}

// If the script is run directly
if (require.main === module) {
  generateIcons()
    .catch((error) => {
      console.error('Icon generation failed:', error)
      process.exit(1)
    })
}
