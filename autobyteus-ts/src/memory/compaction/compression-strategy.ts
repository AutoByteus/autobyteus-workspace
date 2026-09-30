/** The compaction host accepts an untagged, validated summary body. */
export interface CompressionStrategy {
  compress(content: string): Promise<string>;
}
