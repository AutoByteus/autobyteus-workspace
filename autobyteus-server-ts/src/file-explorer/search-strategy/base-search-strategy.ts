export abstract class BaseFileSearchStrategy {
  abstract search(rootPath: string, query: string): Promise<string[]>;

  abstract isAvailable(): boolean;
}
