import {
  validateDiscordBindingIdentity as validateSharedDiscordBindingIdentity,
  type DiscordBindingIdentityValidationCode,
  type DiscordBindingIdentityValidationIssue,
} from "autobyteus-ts/external-channel/discord-binding-identity.js";

export type DiscordBindingIdentityValidationField =
  DiscordBindingIdentityValidationIssue["field"];

export type DiscordBindingIdentityValidationErrorPayload = {
  code: DiscordBindingIdentityValidationCode;
  field: DiscordBindingIdentityValidationField;
  detail: string;
};

export type DiscordBindingIdentityValidatorInput = {
  accountId: string;
  peerId: string;
  threadId: string | null;
  expectedAccountId?: string | null;
};

export class DiscordBindingIdentityValidationError extends Error {
  readonly code: DiscordBindingIdentityValidationCode;
  readonly field: DiscordBindingIdentityValidationField;
  readonly detail: string;

  constructor(issue: DiscordBindingIdentityValidationIssue) {
    super(issue.detail);
    this.name = "DiscordBindingIdentityValidationError";
    this.code = issue.code;
    this.field = issue.field;
    this.detail = issue.detail;
  }

  toPayload(): DiscordBindingIdentityValidationErrorPayload {
    return {
      code: this.code,
      field: this.field,
      detail: this.detail,
    };
  }
}

export class DiscordBindingIdentityValidator {
  validate(input: DiscordBindingIdentityValidatorInput): void {
    const issues = validateSharedDiscordBindingIdentity({
      accountId: input.accountId,
      peerId: input.peerId,
      threadId: input.threadId,
      expectedAccountId: input.expectedAccountId,
    });

    if (issues.length > 0) {
      throw new DiscordBindingIdentityValidationError(issues[0]);
    }
  }
}
