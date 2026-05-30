export type ReadyState = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

export const createReadyState = (): ReadyState => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
