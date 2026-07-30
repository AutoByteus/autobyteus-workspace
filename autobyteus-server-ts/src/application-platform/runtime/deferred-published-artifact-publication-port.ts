import type {
  PublishedArtifactPublicationPort,
  PublishedArtifactPublicationRequest,
} from "../../services/published-artifacts/published-artifact-publication-port.js";
import type {
  PublishedArtifactSummary,
} from "../../services/published-artifacts/published-artifact-types.js";

type DeferredPublicationPortState =
  | { kind: "unbound" }
  | { kind: "bound"; target: PublishedArtifactPublicationPort }
  | { kind: "closed" };

export class DeferredPublishedArtifactPublicationPort
implements PublishedArtifactPublicationPort {
  private state: DeferredPublicationPortState = { kind: "unbound" };

  bind(target: PublishedArtifactPublicationPort): void {
    if (this.state.kind === "closed") {
      throw new Error("Published artifact publication authority is closed.");
    }
    if (this.state.kind === "bound") {
      throw new Error("Published artifact publication authority is already bound.");
    }
    this.state = { kind: "bound", target };
  }

  assertBound(): void {
    if (this.state.kind === "closed") {
      throw new Error("Published artifact publication authority is closed.");
    }
    if (this.state.kind !== "bound") {
      throw new Error("Published artifact publication authority is not bound.");
    }
  }

  async publishManyForRun(
    input: PublishedArtifactPublicationRequest,
  ): Promise<PublishedArtifactSummary[]> {
    this.assertBound();
    const target = this.state.kind === "bound" ? this.state.target : null;
    if (!target) {
      throw new Error("Published artifact publication authority is not bound.");
    }
    return target.publishManyForRun(input);
  }

  close(): void {
    this.state = { kind: "closed" };
  }
}
