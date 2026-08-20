import { execFileSync } from 'child_process'
import * as fs from 'fs'
import { logger } from '../logger'

const BASH_PATH = '/bin/bash'
const ZSH_PATH = '/bin/zsh'
let cachedLoginPath: string | null | undefined

function pickLoginShell(): string | null {
  const shell = (process.env.SHELL || '').toLowerCase()
  if (shell.includes('zsh') && fs.existsSync(ZSH_PATH)) {
    return ZSH_PATH
  }
  if (shell.includes('bash') && fs.existsSync(BASH_PATH)) {
    return BASH_PATH
  }
  if (fs.existsSync(BASH_PATH)) {
    return BASH_PATH
  }
  if (fs.existsSync(ZSH_PATH)) {
    return ZSH_PATH
  }
  return null
}

/**
 * Get PATH from the user's login shell (zsh or bash).
 * This helps GUI-launched Electron apps inherit user PATH on macOS/Linux.
 */
export function getLoginShellPath(): string | null {
  if (cachedLoginPath !== undefined) {
    return cachedLoginPath
  }

  const shellPath = pickLoginShell()
  if (!shellPath) {
    logger.warn('No supported login shell found; skipping PATH enrichment')
    cachedLoginPath = null
    return cachedLoginPath
  }

  const isZsh = shellPath === ZSH_PATH
  const script = isZsh
    ? 'if [ -f ~/.zshrc ]; then source ~/.zshrc >/dev/null 2>&1; fi; print -r -- "$PATH"'
    : 'if [ -f ~/.bashrc ]; then source ~/.bashrc >/dev/null 2>&1; fi; printf "%s" "$PATH"'

  try {
    const output = execFileSync(shellPath, ['-lc', script], {
      env: process.env,
      encoding: 'utf8'
    })

    const pathValue = output.trim()
    if (!pathValue) {
      logger.warn('Login shell PATH was empty; falling back to process.env.PATH')
      cachedLoginPath = null
      return cachedLoginPath
    }

    logger.info(`Loaded PATH from ${isZsh ? 'zsh' : 'bash'} login shell`)
    logger.info(`Login shell PATH: ${pathValue}`)
    cachedLoginPath = pathValue
    return cachedLoginPath
  } catch (error) {
    logger.warn(`Failed to load PATH from login shell: ${error}`)
    cachedLoginPath = null
    return cachedLoginPath
  }
}
