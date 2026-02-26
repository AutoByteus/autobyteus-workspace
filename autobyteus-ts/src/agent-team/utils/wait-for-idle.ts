import { AgentTeamEventStream } from '../streaming/agent-team-event-stream.js';
import { AgentTeamStatus } from '../status/agent-team-status.js';

export type AgentTeamLike = {
  teamId: string;
  currentStatus?: AgentTeamStatus;
};

const waitLoop = async (streamer: AgentTeamEventStream, teamId: string): Promise<void> => {
  for await (const event of streamer.allEvents()) {
    if (event.event_source_type !== 'TEAM') {
      continue;
    }
    const data = event.data as { new_status?: AgentTeamStatus; error_message?: string } | undefined;
    if (data?.new_status === AgentTeamStatus.IDLE) {
      console.info(`Team '${teamId}' has become idle.`);
      return;
    }
    if (data?.new_status === AgentTeamStatus.ERROR) {
      const errorMessage =
        `Team '${teamId}' entered an error state while waiting for idle: ${data?.error_message ?? ''}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
};

export async function waitForTeamToBeIdle(team: AgentTeamLike, timeout: number = 60.0): Promise<void> {
  if (team.currentStatus === AgentTeamStatus.IDLE) {
    return;
  }

  console.info(`Waiting for team '${team.teamId}' to become idle (timeout: ${timeout}s)...`);

  const streamer = new AgentTeamEventStream(team as any);
  try {
    const timeoutMs = Math.max(0, timeout * 1000);
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout waiting for team to become idle')), timeoutMs)
    );
    await Promise.race([waitLoop(streamer, team.teamId), timeoutPromise]);
  } finally {
    await streamer.close();
  }
}
