import { Mutation, Resolver } from "type-graphql";
import { getEmbeddingIndex } from "../../../embeddings/embedding-index.js";

/** The board's Retry for an unavailable embedding model. */
@Resolver()
export class EmbeddingModelResolver {
  /** Clears the unavailable state so the next search tries again; false when the model was not unavailable. */
  @Mutation(() => Boolean)
  retryEmbeddingModel(): boolean {
    return getEmbeddingIndex().retryModel();
  }
}
