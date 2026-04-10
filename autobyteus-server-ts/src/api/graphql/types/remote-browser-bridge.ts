import { Arg, Field, InputType, Mutation, ObjectType, Resolver } from "type-graphql";
import {
  getRuntimeBrowserBridgeRegistrationService,
  type RuntimeBrowserBridgeBinding,
} from "../../../agent-tools/browser/runtime-browser-bridge-registration-service.js";

@InputType()
export class RemoteBrowserBridgeInput implements RuntimeBrowserBridgeBinding {
  @Field(() => String)
  baseUrl!: string;

  @Field(() => String)
  authToken!: string;

  @Field(() => String)
  expiresAt!: string;
}

@ObjectType()
export class RemoteBrowserBridgeMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class RemoteBrowserBridgeResolver {
  @Mutation(() => RemoteBrowserBridgeMutationResult)
  registerRemoteBrowserBridge(
    @Arg("input", () => RemoteBrowserBridgeInput) input: RemoteBrowserBridgeInput,
  ): RemoteBrowserBridgeMutationResult {
    getRuntimeBrowserBridgeRegistrationService().registerBinding(input);
    return {
      success: true,
      message: "Remote browser bridge registered.",
    };
  }

  @Mutation(() => RemoteBrowserBridgeMutationResult)
  clearRemoteBrowserBridge(): RemoteBrowserBridgeMutationResult {
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
    return {
      success: true,
      message: "Remote browser bridge cleared.",
    };
  }
}
