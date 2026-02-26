import { DynamicEnum } from '../../utils/dynamic-enum.js';

export class InterAgentMessageType extends DynamicEnum {
  static TASK_ASSIGNMENT = InterAgentMessageType.add('TASK_ASSIGNMENT', 'task_assignment') as InterAgentMessageType;
  static TASK_RESULT = InterAgentMessageType.add('TASK_RESULT', 'task_result') as InterAgentMessageType;
  static TASK_COMPLETED = InterAgentMessageType.add('TASK_COMPLETED', 'task_completed') as InterAgentMessageType;
  static CLARIFICATION = InterAgentMessageType.add('CLARIFICATION', 'clarification') as InterAgentMessageType;
  static ERROR = InterAgentMessageType.add('ERROR', 'error') as InterAgentMessageType;

  static addType(name: string, value: string): InterAgentMessageType | null {
    try {
      return this.add(name, value) as InterAgentMessageType;
    } catch (error) {
      // Mirror Python's warning behavior without throwing.
      // eslint-disable-next-line no-console
      console.warn(`Warning: Failed to add new inter-agent message type. ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
