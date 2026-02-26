import { Agent } from '../agent.js';
import { AgentEventStream } from '../streaming/streams/agent-event-stream.js';
import { AgentStatus } from '../status/status-enum.js';

const waitLoop = async (streamer: AgentEventStream, agentId: string): Promise<void> => {
  for await (const statusUpdate of streamer.streamStatusUpdates()) {
    if (statusUpdate.new_status === AgentStatus.IDLE) {
      console.info(`Agent '${agentId}' has become idle.`);
      return;
    }
    if (statusUpdate.new_status === AgentStatus.ERROR) {
      const errorMessage =
        `Agent '${agentId}' entered an error state while waiting for idle: ${statusUpdate}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
};

export async function waitForAgentToBeIdle(agent: Agent, timeout: number = 30.0): Promise<void> {
  if (!(agent instanceof Agent)) {
    throw new TypeError("The 'agent' argument must be an instance of the Agent class.");
  }

  const currentStatus = agent.currentStatus;
  if (AgentStatus.isTerminal(currentStatus)) {
    console.warn(
      `Agent '${agent.agentId}' is already in a terminal state (${currentStatus}) and will not become idle.`
    );
    return;
  }

  if (currentStatus === AgentStatus.IDLE) {
    console.debug(`Agent '${agent.agentId}' is already idle.`);
    return;
  }

  console.info(`Waiting for agent '${agent.agentId}' to become idle (timeout: ${timeout}s)...`);

  const streamer = new AgentEventStream(agent);
  const timeoutMs = Math.max(0, timeout * 1000);
  const timeoutPromise = new Promise<void>((_resolve, reject) => {
    const handle = setTimeout(() => {
      clearTimeout(handle);
      reject(new Error(`Timed out waiting for agent '${agent.agentId}' to become idle.`));
    }, timeoutMs);
  });

  try {
    await Promise.race([waitLoop(streamer, agent.agentId), timeoutPromise]);
  } finally {
    await streamer.close();
  }
}
