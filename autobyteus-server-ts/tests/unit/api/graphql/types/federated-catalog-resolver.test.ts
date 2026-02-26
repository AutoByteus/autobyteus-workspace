import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import {
  FederatedCatalogResolver,
  FederatedNodeCatalogQueryInput,
} from "../../../../../src/api/graphql/types/federated-catalog.js";

describe("FederatedCatalogResolver", () => {
  it("delegates query input to federated catalog service", async () => {
    const resolver = new FederatedCatalogResolver();
    const listCatalogByNodes = vi.fn(async () => [
      {
        nodeId: "embedded-local",
        nodeName: "Local",
        baseUrl: "http://localhost:8000",
        status: "ready",
        errorMessage: null,
        agents: [],
        teams: [],
      },
    ]);

    (resolver as any).federatedCatalogService = {
      listCatalogByNodes,
    };

    const input: FederatedNodeCatalogQueryInput = {
      nodes: [
        {
          nodeId: "embedded-local",
          nodeName: "Local",
          baseUrl: "http://localhost:8000",
          nodeType: "local",
        },
      ],
    };

    const result = await resolver.federatedNodeCatalog(input);

    expect(result).toHaveLength(1);
    expect(listCatalogByNodes).toHaveBeenCalledWith({ nodes: input.nodes });
  });
});
