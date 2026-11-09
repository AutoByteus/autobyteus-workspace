import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { createGraphqlRequestContext } from "../../../../src/api/graphql/graphql-request-context.js";

type Raw = EventEmitter & { aborted?: boolean; destroyed?: boolean };
const raw = (props: { aborted?: boolean; destroyed?: boolean } = {}): Raw => Object.assign(new EventEmitter(), props);
const contextFor = (request: Raw, response: Raw) =>
  createGraphqlRequestContext({ raw: request } as never, { raw: response } as never);

describe("GraphQL request abort signal", () => {
  it("is not aborted for a request whose body was read (its stream ended and was destroyed by a body hook)", () => {
    const { requestAbortSignal } = contextFor(raw({ aborted: false, destroyed: true }), raw({ destroyed: false }));
    expect(requestAbortSignal.aborted).toBe(false);
  });

  it("is aborted when the client aborted the request, or the response is already destroyed", () => {
    expect(contextFor(raw({ aborted: true }), raw()).requestAbortSignal.aborted).toBe(true);
    expect(contextFor(raw(), raw({ destroyed: true })).requestAbortSignal.aborted).toBe(true);
  });

  it("aborts when the response closes before it finishes, and not after it finished", () => {
    const early = raw();
    const earlySignal = contextFor(raw(), early).requestAbortSignal;
    early.emit("close");
    expect(earlySignal.aborted).toBe(true);

    const finished = raw();
    const finishedSignal = contextFor(raw(), finished).requestAbortSignal;
    finished.emit("finish");
    finished.emit("close");
    expect(finishedSignal.aborted).toBe(false);
  });
});
