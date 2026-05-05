export type OrderedProcessor = {
  getName: () => string;
  getOrder: () => number;
};

export const sortProcessors = <T extends OrderedProcessor>(processors: T[]): T[] =>
  [...processors].sort((left, right) => left.getOrder() - right.getOrder());

export const isOrderedProcessor = (value: unknown): value is OrderedProcessor => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as OrderedProcessor;
  return typeof candidate.getName === 'function' && typeof candidate.getOrder === 'function';
};
