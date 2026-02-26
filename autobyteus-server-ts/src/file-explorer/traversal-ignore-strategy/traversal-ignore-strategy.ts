export interface TraversalIgnoreStrategy {
  shouldIgnore(path: string, isDirectory: boolean): boolean;
}
