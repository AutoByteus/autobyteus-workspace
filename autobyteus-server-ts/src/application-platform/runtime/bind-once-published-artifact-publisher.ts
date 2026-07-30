import type {
  PublishedArtifactPublisher,
  PublishedArtifactPublicationRequest,
} from "../../services/published-artifacts/published-artifact-publisher.js";
import type {
  PublishedArtifactSummary,
} from "../../services/published-artifacts/published-artifact-types.js";

type BindOncePublishedArtifactPublisherState =
  | { kind: "unbound" }
  | { kind: "bound"; target: PublishedArtifactPublisher }
  | { kind: "closed" };

export class BindOncePublishedArtifactPublisher
implements PublishedArtifactPublisher {
  private state: BindOncePublishedArtifactPublisherState = { kind: "unbound" };

  bind(target: PublishedArtifactPublisher): void {
    if (this.state.kind === "closed") {
      throw new Error("Published artifact publisher is closed.");
    }
    if (this.state.kind === "bound") {
      throw new Error("Published artifact publisher is already bound.");
    }
    this.state = { kind: "bound", target };
  }

  assertBound(): void {
    if (this.state.kind === "closed") {
      throw new Error("Published artifact publisher is closed.");
    }
    if (this.state.kind !== "bound") {
      throw new Error("Published artifact publisher is not bound.");
    }
  }

  async publishManyForRun(
    input: PublishedArtifactPublicationRequest,
  ): Promise<PublishedArtifactSummary[]> {
    this.assertBound();
    const target = this.state.kind === "bound" ? this.state.target : null;
    if (!target) {
      throw new Error("Published artifact publisher is not bound.");
    }
    return target.publishManyForRun(input);
  }

  close(): void {
    this.state = { kind: "closed" };
  }
}
