import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import type { ChannelRunDispatchHooks } from "./channel-run-dispatch-hooks.js";
import {
  ChannelAgentRunFacade,
  type ChannelAgentRunFacadeDependencies,
} from "./channel-agent-run-facade.js";
import {
  ChannelTeamRunFacade,
  type ChannelTeamRunFacadeDependencies,
} from "./channel-team-run-facade.js";

export type ChannelRunFacadeDependencies = {
  agentRunFacade?: ChannelAgentRunFacade;
  teamRunFacade?: ChannelTeamRunFacade;
  agentRunFacadeDeps?: ChannelAgentRunFacadeDependencies;
  teamRunFacadeDeps?: ChannelTeamRunFacadeDependencies;
};

export class ChannelRunFacade {
  private readonly agentRunFacade: ChannelAgentRunFacade;
  private readonly teamRunFacade: ChannelTeamRunFacade;

  constructor(deps: ChannelRunFacadeDependencies = {}) {
    if (deps.agentRunFacade) {
      this.agentRunFacade = deps.agentRunFacade;
    } else {
      const sharedRunLauncher = new ChannelBindingRunLauncher();
      this.agentRunFacade = new ChannelAgentRunFacade({
        runLauncher: sharedRunLauncher,
        ...deps.agentRunFacadeDeps,
      });
      this.teamRunFacade =
        deps.teamRunFacade ??
        new ChannelTeamRunFacade({
          runLauncher: sharedRunLauncher,
          ...deps.teamRunFacadeDeps,
        });
      return;
    }

    this.teamRunFacade =
      deps.teamRunFacade ?? new ChannelTeamRunFacade(deps.teamRunFacadeDeps);
  }

  async dispatchToBinding(
    binding: ChannelBinding,
    envelope: ExternalMessageEnvelope,
    hooks: ChannelRunDispatchHooks = {},
  ): Promise<ChannelRunDispatchResult> {
    if (binding.targetType === "AGENT") {
      return this.agentRunFacade.dispatchToAgentBinding(binding, envelope, hooks);
    }
    return this.teamRunFacade.dispatchToTeamBinding(binding, envelope, hooks);
  }
}
