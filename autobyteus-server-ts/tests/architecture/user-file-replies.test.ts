import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Every node route that answers with a user file's content does it through `sendUserFile`
 * (`src/api/rest/user-file-reply.ts`), which owns the headers that keep the file out of the node's origin
 * (autobyteus-416, REQ-007), which also opens the file: no other file under `src/api/rest/` streams one. Named
 * exceptions:
 * - `application-bundles.ts`: installed application code, designed to run at the node's origin;
 * - `project-task-context-files.ts`: Task context files, already `nosniff` + `attachment` (F16).
 * `application-backends.ts` proxies installed application backends; it sends their response body, not a file
 * stream, so the detector does not match it and it needs no exception.
 */

const THIS_FILE = fileURLToPath(import.meta.url);
const REST = resolve(dirname(THIS_FILE), "../../src/api/rest");
const OWNER = "user-file-reply.ts";
const EXCEPTIONS = ["application-bundles.ts", "project-task-context-files.ts"];
const FILE_ROUTES = [
  "workspaces.ts",
  "files.ts",
  "context-files.ts",
  "run-file-changes.ts",
  // The message references of every root kind (F13-F15), one route since autobyteus-615.
  "collaboration-message-references.ts",
];
const PROTECTIVE_HEADERS = /^(content-security-policy|x-content-type-options)$/i;

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});

const restFiles = () => listFiles(REST).filter((path) => path.endsWith(".ts")).map((path) => relative(REST, path));

const parse = (file: string) =>
  ts.createSourceFile(file, readFileSync(join(REST, file), "utf8"), ts.ScriptTarget.Latest, true);

const isFileStream = (node: ts.Node): boolean =>
  (ts.isCallExpression(node) && (
    (ts.isIdentifier(node.expression) && node.expression.text === "createReadStream")
    || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "createReadStream")))
  || (ts.isPropertyAccessExpression(node) && node.name.text === "stream");

const visit = (file: string, onNode: (node: ts.Node, source: ts.SourceFile) => void) => {
  const source = parse(file);
  const walk = (node: ts.Node): void => {
    onNode(node, source);
    ts.forEachChild(node, walk);
  };
  walk(source);
};

const where = (file: string, node: ts.Node, source: ts.SourceFile) =>
  `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.getText()}`;

describe("user file replies (autobyteus-416)", () => {
  const governed = () => restFiles().filter((file) => file !== OWNER && !EXCEPTIONS.includes(file));

  it("streams a file only in sendUserFile", () => {
    const bypasses: string[] = [];
    for (const file of governed()) {
      visit(file, (node, source) => {
        if (isFileStream(node)) bypasses.push(where(file, node, source));
      });
    }
    expect(bypasses).toEqual([]);
  });

  it("leaves the user-file headers to sendUserFile", () => {
    const headerWrites: string[] = [];
    for (const file of governed()) {
      visit(file, (node, source) => {
        if (
          ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === "header"
          && node.arguments[0]
          && ts.isStringLiteral(node.arguments[0])
          && PROTECTIVE_HEADERS.test(node.arguments[0].text)
        ) headerWrites.push(where(file, node, source));
      });
    }
    expect(headerWrites).toEqual([]);
  });

  it("finds sendUserFile in every file route (F1-F15) and a stream in every named exception", () => {
    const callsSendUserFile = (file: string) => readFileSync(join(REST, file), "utf8").includes("sendUserFile(reply");
    expect(FILE_ROUTES.filter((file) => !callsSendUserFile(file))).toEqual([]);
    const streams = (file: string) => {
      let found = false;
      visit(file, (node) => { found ||= isFileStream(node); });
      return found;
    };
    expect(EXCEPTIONS.filter((file) => !streams(file))).toEqual([]);
  });
});
