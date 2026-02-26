import type {
  ChannelBinding,
  ChannelDispatchTarget,
  ChannelBindingLookup,
  ChannelSourceRoute,
  UpsertChannelBindingInput,
} from "../domain/models.js";

export interface ChannelBindingProvider {
  findBinding(input: ChannelBindingLookup): Promise<ChannelBinding | null>;
  isRouteBoundToTarget(
    route: ChannelSourceRoute,
    target: ChannelDispatchTarget,
  ): Promise<boolean>;
  listBindings(): Promise<ChannelBinding[]>;
  upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding>;
  deleteBinding(bindingId: string): Promise<boolean>;
}
