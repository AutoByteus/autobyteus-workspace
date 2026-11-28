import { describe, expect, it } from "vitest";
import {
  definitionAvatarAddress,
  effectiveBaseAvatarUrl,
  isDefinitionAvatarAddress,
  userAvatarInput,
  userAvatarUrlOf,
} from "../../../src/agent-package-definitions/domain/definition-avatar-address.js";
import { toGraphqlDefinitionAvatar } from "../../../src/api/graphql/types/definition-avatar-fields.js";

const avatar = Object.freeze({ folder: "/packages/a/agents/x", fileName: "avatar.png", mimeType: "image/png", version: "0123456789ab", hash: "0123456789ab".padEnd(64, "0") });

// autobyteus-669 S-2 (REQ-003; SR-002 AR-001).
describe("definition picture addresses", () => {
  it("addresses a package picture by kind, encoded ID and version", () => {
    expect(definitionAvatarAddress("agent", "x", avatar)).toBe("/rest/definition-avatars/agent/x?v=0123456789ab");
    expect(definitionAvatarAddress("agent_team", "org/team a", avatar)).toBe("/rest/definition-avatars/agent_team/org%2Fteam%20a?v=0123456789ab");
  });

  it.each([
    ["/rest/definition-avatars/agent/x?v=0123456789ab", true],
    ["/rest/definition-avatars/agent_org/y?v=stale", true],
    ["/rest/definition-avatars/agent/x", true],
    ["http://127.0.0.1:29695/rest/definition-avatars/agent/x?v=1", true],
    ["  /rest/definition-avatars/agent/x  ", true],
    ["/rest/files/images/a.png", false],
    ["https://example.com/avatar.png", false],
    ["", false],
    [null, false],
  ])("recognizes %s by its path: %s", (value, expected) => {
    expect(isDefinitionAvatarAddress(value)).toBe(expected);
  });

  it("reads the user's picture from a mutation: absent keeps, null, '' and a package address clear", () => {
    expect(userAvatarInput(undefined)).toBeUndefined();
    expect(userAvatarInput(null)).toBeNull();
    expect(userAvatarInput("")).toBeNull();
    expect(userAvatarInput("   ")).toBeNull();
    expect(userAvatarInput("/rest/definition-avatars/agent/x?v=old")).toBeNull();
    expect(userAvatarInput(" /rest/files/images/u.png ")).toBe("/rest/files/images/u.png");
  });

  it("shows the user's or config picture, else the package's, else nothing", () => {
    expect(effectiveBaseAvatarUrl("/rest/files/images/u.png", avatar, "agent", "x")).toBe("/rest/files/images/u.png");
    expect(effectiveBaseAvatarUrl(null, avatar, "agent", "x")).toBe("/rest/definition-avatars/agent/x?v=0123456789ab");
    expect(effectiveBaseAvatarUrl("", avatar, "agent_org", "o")).toBe("/rest/definition-avatars/agent_org/o?v=0123456789ab");
    expect(effectiveBaseAvatarUrl(null, null, "agent", "x")).toBeNull();
  });

  it("counts as the user's picture only the personal setting where personal settings apply, else the config's", () => {
    expect(userAvatarUrlOf("/rest/files/images/u.png", true)).toBe("/rest/files/images/u.png");
    expect(userAvatarUrlOf("https://cdn.example/package.png", false)).toBeNull();
    expect(userAvatarUrlOf("/rest/files/images/own.png", null)).toBe("/rest/files/images/own.png");
    expect(userAvatarUrlOf("/rest/definition-avatars/agent/x?v=1", null)).toBeNull();
    expect(userAvatarUrlOf(null, null)).toBeNull();
  });
});

describe("toGraphqlDefinitionAvatar (the walks of SR-002)", () => {
  const packageView = (personal: boolean) => ({ base: "PACKAGE" as const, settings: personal ? ["AVATAR" as const] : [] });

  it("a package definition with a package picture and no user picture: shown the package's, no user picture", () => {
    expect(toGraphqlDefinitionAvatar("agent", { id: "x", avatarUrl: null, packageAvatar: avatar }, packageView(false)))
      .toEqual({ avatarUrl: "/rest/definition-avatars/agent/x?v=0123456789ab", userAvatarUrl: null });
  });

  it("a package definition with the user's upload: shown and editable as the user's", () => {
    expect(toGraphqlDefinitionAvatar("agent_team", { id: "t", avatarUrl: "/rest/files/images/u.png", packageAvatar: avatar }, packageView(true)))
      .toEqual({ avatarUrl: "/rest/files/images/u.png", userAvatarUrl: "/rest/files/images/u.png" });
  });

  it("a package definition whose config sets a picture: the package's, not the user's", () => {
    expect(toGraphqlDefinitionAvatar("agent_org", { id: "o", avatarUrl: "https://cdn.example/o.png", packageAvatar: null }, packageView(false)))
      .toEqual({ avatarUrl: "https://cdn.example/o.png", userAvatarUrl: null });
  });

  it("the user's own definition: its config's upload wins over its folder file and is the user's", () => {
    expect(toGraphqlDefinitionAvatar("agent", { id: "mine", avatarUrl: "/rest/files/images/own.png", packageAvatar: avatar }, { base: null, settings: [] }))
      .toEqual({ avatarUrl: "/rest/files/images/own.png", userAvatarUrl: "/rest/files/images/own.png" });
    expect(toGraphqlDefinitionAvatar("agent", { id: "mine", avatarUrl: null, packageAvatar: avatar }, null))
      .toEqual({ avatarUrl: "/rest/definition-avatars/agent/mine?v=0123456789ab", userAvatarUrl: null });
  });

  it("no picture anywhere: nothing, so the client's fallback shows", () => {
    expect(toGraphqlDefinitionAvatar("agent", { id: "x", avatarUrl: null, packageAvatar: null }, packageView(false)))
      .toEqual({ avatarUrl: null, userAvatarUrl: null });
  });
});
