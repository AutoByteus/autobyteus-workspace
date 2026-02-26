import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const DESCRIPTION =
  "Writes source files (Vue/TS/etc.) to a target frontend project and triggers a production build. " +
  "Requires ANIMATION_RENDERER_PATH to point at the target Nuxt 3 project.";

const fileSchema = new ParameterSchema();
fileSchema.addParameter(
  new ParameterDefinition({
    name: "path",
    type: ParameterType.STRING,
    description: "Relative file path (e.g., 'MyComponent.vue').",
    required: true,
  }),
);
fileSchema.addParameter(
  new ParameterDefinition({
    name: "content",
    type: ParameterType.STRING,
    description: "File contents to write.",
    required: true,
  }),
);

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "files",
    type: ParameterType.ARRAY,
    description: "List of file objects with 'path' and 'content'.",
    required: true,
    arrayItemSchema: fileSchema,
  }),
);

type FilePayload = { path: string; content: string };

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

function ensureSafeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^([.][\\/])+/, "");
  if (path.isAbsolute(normalized)) {
    throw new Error(`Invalid file path specified: ${relativePath}. Path traversal is not allowed.`);
  }
  const segments = normalized.split(path.sep);
  if (segments.includes("..")) {
    throw new Error(`Invalid file path specified: ${relativePath}. Path traversal is not allowed.`);
  }
  return normalized;
}

function runCommand(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: "utf-8",
  });

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`'${command}' command not found. Please ensure it is installed and in PATH.`);
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr) : "";
    const stdout = result.stdout ? String(result.stdout) : "";
    throw new Error(`${command} ${args.join(" ")} failed. ${stderr || stdout}`);
  }
}

export async function frontendBuilderTool(files: FilePayload[]): Promise<string> {
  const rendererPath = process.env.ANIMATION_RENDERER_PATH;
  if (!rendererPath) {
    throw new Error(
      "Environment variable 'ANIMATION_RENDERER_PATH' is not set. Cannot build frontend application.",
    );
  }

  if (!fs.existsSync(rendererPath) || !fs.statSync(rendererPath).isDirectory()) {
    throw new Error(`The specified ANIMATION_RENDERER_PATH does not exist: ${rendererPath}`);
  }

  const generatedSrcDir = path.join(rendererPath, "components", "generated");
  const resolvedGeneratedRoot = path.resolve(generatedSrcDir);

  logger.info(`Cleaning source directory: ${generatedSrcDir}`);
  fs.rmSync(generatedSrcDir, { recursive: true, force: true });
  fs.mkdirSync(generatedSrcDir, { recursive: true });

  logger.info(`Writing ${files.length} new source files...`);
  for (const file of files) {
    const safeRelativePath = ensureSafeRelativePath(file.path);
    const targetPath = path.resolve(generatedSrcDir, safeRelativePath);

    if (!targetPath.startsWith(resolvedGeneratedRoot + path.sep)) {
      throw new Error(`Invalid file path specified: ${file.path}. Path traversal is not allowed.`);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, file.content, "utf-8");
    logger.info(`Wrote file: ${targetPath}`);
  }

  logger.info(`Starting 'yarn install' in ${rendererPath}...`);
  runCommand("yarn", ["install"], rendererPath);

  logger.info(`Starting 'yarn build' in ${rendererPath}...`);
  runCommand("yarn", ["build"], rendererPath);

  return "Frontend application built successfully. The application is ready to be served.";
}

const TOOL_NAME = "FrontendBuilderTool";
let cachedTool: BaseTool | null = null;

export function registerFrontendBuilderTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Application Tools",
    })(frontendBuilderTool) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
