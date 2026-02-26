export function formatAudioTimestamp(time: number) {
  const padTime = (t: number) => String(t).padStart(2, '0');
  const hours = Math.floor(time / 3600);
  time -= hours * 3600;
  const minutes = Math.floor(time / 60);
  time -= minutes * 60;
  const seconds = Math.floor(time);
  return `${hours ? padTime(hours) + ':' : ''}${padTime(minutes)}:${padTime(
    seconds,
  )}`;
}