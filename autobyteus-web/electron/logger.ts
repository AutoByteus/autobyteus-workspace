import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as util from 'util'

class Logger {
  private logPath: string
  private fileStream: fs.WriteStream | null = null

  constructor() {
    // Ensure log directory exists
    const logDir = path.join(os.homedir(), '.autobyteus', 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    // Use a fixed filename instead of date-based name
    this.logPath = path.join(logDir, 'app.log')
    this.initLogStream()
  }

  private initLogStream(): void {
    try {
      // Use 'w' flag to overwrite the file on startup instead of 'a' (append)
      this.fileStream = fs.createWriteStream(this.logPath, { flags: 'w' })
      
      // Write a header to the log file with the application start time
      const startupTime = new Date().toISOString()
      this.fileStream.write(`[${startupTime}] [INFO] Application started\n`)
    } catch (error) {
      console.error('Failed to create log file stream:', error)
    }
  }

  private formatMessage(level: string, message: any, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    let formattedMessage = `[${timestamp}] [${level}] `
    
    if (typeof message === 'string') {
      formattedMessage += util.format(message, ...args)
    } else {
      formattedMessage += util.format(message, ...args)
    }
    
    return formattedMessage
  }

  private write(level: string, message: any, ...args: any[]): void {
    const formattedMessage = this.formatMessage(level, message, ...args)
    
    // Write to console
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage)
        break
      case 'WARN':
        console.warn(formattedMessage)
        break
      case 'INFO':
        console.log(formattedMessage)
        break
      case 'DEBUG':
        console.debug(formattedMessage)
        break
      default:
        console.log(formattedMessage)
    }
    
    // Write to file
    if (this.fileStream) {
      this.fileStream.write(formattedMessage + '\n')
    }
  }

  getLogPath(): string {
    return this.logPath
  }

  debug(message: any, ...args: any[]): void {
    this.write('DEBUG', message, ...args)
  }

  info(message: any, ...args: any[]): void {
    this.write('INFO', message, ...args)
  }

  warn(message: any, ...args: any[]): void {
    this.write('WARN', message, ...args)
  }

  error(message: any, ...args: any[]): void {
    this.write('ERROR', message, ...args)
  }

  close(): void {
    if (this.fileStream) {
      this.fileStream.end()
      this.fileStream = null
    }
  }
}

export const logger = new Logger()
