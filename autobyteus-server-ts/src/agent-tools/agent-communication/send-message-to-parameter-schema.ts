import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import { SEND_MESSAGE_TO_FIELD_DESCRIPTIONS } from "../../agent-communication/services/send-message-to-tool-contract.js";

export const buildSendMessageToParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "recipient_name",
      type: ParameterType.STRING,
      description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.recipientName,
      required: false,
    }),
    new ParameterDefinition({
      name: "target_agent_run_id",
      type: ParameterType.STRING,
      description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.targetAgentRunId,
      required: false,
    }),
    new ParameterDefinition({
      name: "content",
      type: ParameterType.STRING,
      description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.content,
      required: true,
    }),
    new ParameterDefinition({
      name: "message_type",
      type: ParameterType.STRING,
      description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.messageType,
      required: false,
    }),
    new ParameterDefinition({
      name: "reference_files",
      type: ParameterType.ARRAY,
      description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.referenceFiles,
      required: false,
      arrayItemSchema: ParameterType.STRING,
    }),
  ]);
