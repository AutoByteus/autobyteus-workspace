// Usage: node inspect_inputs.mjs <depsDir> <onnxPath>
import { pathToFileURL } from "node:url"; import fs from "node:fs"; import path from "node:path";
const [depsDir, onnxPath] = process.argv.slice(2);
const ort = await import(pathToFileURL(path.join(depsDir, "node_modules/onnxruntime-web/dist/ort.node.min.mjs")).href);
const dataPath = onnxPath + "_data";
const s = await ort.InferenceSession.create(fs.readFileSync(onnxPath), { executionProviders: ["wasm"], externalData: [{ path: path.basename(dataPath), data: fs.readFileSync(dataPath) }] });
console.log(JSON.stringify(s.inputMetadata ?? "no metadata", null, 1));
