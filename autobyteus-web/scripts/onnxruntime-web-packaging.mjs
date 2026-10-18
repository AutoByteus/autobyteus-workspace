// Desktop server packaging for the embedding runtime (Project Task meaning search). Used by prepare-server.mjs
// (Windows) through its exports and by prepare-server.sh (macOS, Linux) as `node onnxruntime-web-packaging.mjs <stage>`.
//
// onnxruntime-web ships ~135 MB of browser builds in `dist/`; the server's Node build loads only the three files kept
// here (found by running a 4-thread embedding in a worker against a copy pruned to them). Everything outside `dist/`
// stays, including `package.json`, which carries the package's MIT licence (it ships no LICENSE file). The check then
// runs a tiny ONNX graph with WebAssembly threads inside a worker thread, as the server does, so a wrong prune fails
// the build instead of the user's first search.
import { spawn } from 'node:child_process'
import { readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const ONNXRUNTIME_WEB_NODE_FILES = ['ort.node.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']

/** y = Identity(x) over float[2] (ONNX IR 7, opset 13). */
const IDENTITY_MODEL_BASE64 = 'CAc6NwoQCgF4EgF5IghJZGVudGl0eRIBZ1oPCgF4EgoKCAgBEgQKAggCYg8KAXkSCgoICAESBAoCCAJCBAoAEA0='

/** Removes every `onnxruntime-web/dist` file the Node build does not load; returns the bytes removed. */
export async function pruneOnnxruntimeWebDist(nodeModulesRoot) {
  const distDir = path.join(nodeModulesRoot, 'onnxruntime-web', 'dist')
  const entries = await readdir(distDir, { withFileTypes: true }).catch(() => null)
  if (!entries) throw new Error(`onnxruntime-web is missing from ${nodeModulesRoot}`)
  for (const name of ONNXRUNTIME_WEB_NODE_FILES) {
    if (!entries.some((entry) => entry.name === name)) throw new Error(`onnxruntime-web/dist/${name} is missing`)
  }
  let removed = 0
  for (const entry of entries) {
    if (ONNXRUNTIME_WEB_NODE_FILES.includes(entry.name)) continue
    const target = path.join(distDir, entry.name)
    removed += entry.isFile() ? (await stat(target)).size : 0
    await rm(target, { recursive: true, force: true })
  }
  return removed
}

const CHECK_SCRIPT = `
import { Worker } from 'node:worker_threads'
const workerSource = \`
  const { parentPort } = require('node:worker_threads');
  (async () => {
    const ort = await import('onnxruntime-web')
    await import('@huggingface/tokenizers')
    ort.env.wasm.numThreads = 2
    const session = await ort.InferenceSession.create(Buffer.from('${IDENTITY_MODEL_BASE64}', 'base64'), { executionProviders: ['wasm'] })
    const out = await session.run({ x: new ort.Tensor('float32', Float32Array.from([1.5, -2]), [2]) })
    parentPort.postMessage([...out.y.data])
  })().catch((error) => { throw error })
\`
const worker = new Worker(workerSource, { eval: true, execArgv: [] })
const result = await new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject) })
await worker.terminate()
if (JSON.stringify(result) !== '[1.5,-2]') throw new Error('Unexpected embedding runtime result: ' + JSON.stringify(result))
console.log('Embedding runtime validation passed')
`

/** Runs the check with the stage's own node_modules (cwd = stage). */
export function validateEmbeddingRuntime(stageDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', CHECK_SCRIPT], { cwd: stageDir, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Embedding runtime validation failed (exit ${code})`)))
  })
}

// CLI (prepare-server.sh): prune the stage's onnxruntime-web, then check the embedding runtime there.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const stage = process.argv[2]
  if (!stage) throw new Error('Usage: node onnxruntime-web-packaging.mjs <server stage dir>')
  const removed = await pruneOnnxruntimeWebDist(path.join(stage, 'node_modules'))
  console.log(`Removed ${Math.round(removed / 1e6)} MB of onnxruntime-web browser builds`)
  await validateEmbeddingRuntime(stage)
}
