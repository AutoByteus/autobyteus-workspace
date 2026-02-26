import { AgentEventHandler } from './base-event-handler.js';
import { GenericEvent, BaseEvent } from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';

export class GenericEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('GenericEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof GenericEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(`GenericEventHandler received a non-GenericEvent: ${eventType}. Skipping.`);
      return;
    }

    const agentId = context.agentId;
    const payloadText = JSON.stringify(event.payload);
    console.info(
      `Agent '${agentId}' handling GenericEvent with type_name: '${event.typeName}'. Payload: ${payloadText}`
    );

    if (event.typeName === 'example_custom_generic_event') {
      console.info(
        `Handling specific generic event 'example_custom_generic_event' for agent '${agentId}'.`
      );
    } else if (event.typeName === 'another_custom_event') {
      console.info(`Handling specific generic event 'another_custom_event' for agent '${agentId}'.`);
    } else {
      console.warn(
        `Agent '${agentId}' received GenericEvent with unhandled type_name: '${event.typeName}'.`
      );
    }
  }
}
