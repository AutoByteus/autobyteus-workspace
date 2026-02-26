export abstract class SearchStrategy {
  abstract search(query: string, numResults: number): Promise<string>;
  protected abstract formatResults(data: Record<string, unknown>): string;
}
