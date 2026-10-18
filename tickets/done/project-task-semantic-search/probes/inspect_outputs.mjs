// Usage: node inspect_outputs.mjs <depsDir> <modelsDir> <modelId> <dtype>
import { createRequire } from "node:module"; import { pathToFileURL } from "node:url"; import path from "node:path";
const [depsDir, modelsDir, id, dtype] = process.argv.slice(2);
const require = createRequire(path.join(depsDir, "package.json"));
const tf = await import(pathToFileURL(require.resolve("@huggingface/transformers")).href); tf.env.cacheDir = modelsDir;
const tok = await tf.AutoTokenizer.from_pretrained(id); const model = await tf.AutoModel.from_pretrained(id, { dtype, device: "cpu" });
const inp = tok(["hello world"], { padding: false }); console.log("ids", inp.input_ids.tolist()[0]);
const out = await model(inp); for (const [k, v] of Object.entries(out)) console.log(k, v.dims);
