import type {
  WorkingContextCompactionStrategy,
  WorkingContextCompactionStrategyConstructionContext,
} from './working-context-compaction-strategy.js';

export type WorkingContextCompactionStrategyInfo = Readonly<{
  id: string;
  name: string;
}>;

export type WorkingContextCompactionStrategyRegistration = Readonly<{
  id: string;
  name: string;
  create(
    context: WorkingContextCompactionStrategyConstructionContext,
  ): WorkingContextCompactionStrategy;
}>;

export class WorkingContextCompactionStrategyRegistry {
  private readonly registrations = new Map<string, WorkingContextCompactionStrategyRegistration>();

  register(registration: WorkingContextCompactionStrategyRegistration): void {
    const id = requireNonBlank(registration.id, 'strategy id');
    const name = requireNonBlank(registration.name, 'strategy name');
    if (this.registrations.has(id)) {
      throw new Error(`Working-context compaction strategy '${id}' is already registered.`);
    }
    if (typeof registration.create !== 'function') {
      throw new Error(`Working-context compaction strategy '${id}' must provide a create callback.`);
    }
    this.registrations.set(id, Object.freeze({ id, name, create: registration.create }));
  }

  get(id: string): WorkingContextCompactionStrategyRegistration | undefined {
    return this.registrations.get(id);
  }

  list(): readonly WorkingContextCompactionStrategyInfo[] {
    return Object.freeze(
      [...this.registrations.values()].map(({ id, name }) => Object.freeze({ id, name })),
    );
  }
}

const requireNonBlank = (value: string, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Working-context compaction ${label} must be a non-empty string.`);
  }
  return value.trim();
};
