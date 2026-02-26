import { AgentTeamEventStream } from './agent-team-event-stream.js';
import type { AgentTeamExternalEventNotifier } from './agent-team-event-notifier.js';
import type { AgentTeamStreamEvent } from './agent-team-stream-events.js';

type TeamLike = { teamId: string } | Record<string, any>;

type BridgeOptions = { stream?: AgentTeamEventStream };

const resolveOptions = (loopOrOptions?: unknown, maybeOptions?: BridgeOptions): BridgeOptions | undefined => {
  if (loopOrOptions && typeof loopOrOptions === 'object' && 'stream' in (loopOrOptions as BridgeOptions)) {
    return loopOrOptions as BridgeOptions;
  }
  return maybeOptions;
};

export class TeamEventBridge {
  private subTeamNodeName: string;
  private parentNotifier: AgentTeamExternalEventNotifier;
  private stream: AgentTeamEventStream;
  private cancelled = false;
  private task: Promise<void>;

  constructor(
    subTeam: TeamLike,
    subTeamNodeName: string,
    parentNotifier: AgentTeamExternalEventNotifier,
    loopOrOptions?: unknown,
    maybeOptions?: BridgeOptions
  ) {
    this.subTeamNodeName = subTeamNodeName;
    this.parentNotifier = parentNotifier;

    const options = resolveOptions(loopOrOptions, maybeOptions);
    this.stream = options?.stream ?? new AgentTeamEventStream(subTeam as any);

    this.task = this.run();
    console.info(`TeamEventBridge created and task started for sub-team '${subTeamNodeName}'.`);
  }

  private async run(): Promise<void> {
    try {
      for await (const event of this.stream.allEvents()) {
        if (this.cancelled) {
          break;
        }
        this.parentNotifier.publishSubTeamEvent(this.subTeamNodeName, event as AgentTeamStreamEvent);
      }
    } catch (error) {
      if (this.cancelled) {
        console.info(`TeamEventBridge task for '${this.subTeamNodeName}' was cancelled.`);
      } else {
        console.error(`Error in TeamEventBridge for '${this.subTeamNodeName}': ${error}`);
      }
    } finally {
      console.debug(`TeamEventBridge task for '${this.subTeamNodeName}' is finishing.`);
    }
  }

  async cancel(): Promise<void> {
    console.info(`Cancelling TeamEventBridge for '${this.subTeamNodeName}'.`);
    this.cancelled = true;
    await this.stream.close();
    await this.task;
    console.info(`TeamEventBridge for '${this.subTeamNodeName}' cancelled successfully.`);
  }
}
