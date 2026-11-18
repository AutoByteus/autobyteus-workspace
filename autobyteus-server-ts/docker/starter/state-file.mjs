// Reading and writing the starter's small JSON state files. A write goes to a temporary file that
// is renamed over the old one, so a reader sees the old or the new content, never a partial file.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** The file's JSON object, or null when the file does not exist. */
export function readJsonFile(file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  return JSON.parse(text)
}

export function writeJsonFile(file, value) {
  mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.tmp-${process.pid}`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(temporary, file)
}
