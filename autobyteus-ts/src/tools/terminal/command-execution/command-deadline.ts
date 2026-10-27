export async function beforeDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  let timer: NodeJS.Timeout;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Command control deadline exceeded')), Math.max(0, deadline - Date.now()));
  })]); } finally { clearTimeout(timer!); }
}
