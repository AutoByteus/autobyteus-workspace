import path from "node:path";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

export class DotIgnoreStrategy implements TraversalIgnoreStrategy {
  shouldIgnore(filePath: string, _isDirectory: boolean): boolean {
    return path.basename(filePath).startsWith(".");
  }
}
