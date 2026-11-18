/** The model a live E2E run uses on one runtime; `fallbackFrom` names the pin it replaced. */
export type LiveModelChoice = Readonly<{ model: string; fallbackFrom?: string }>;

/**
 * Picks a live E2E run's model from the models the runtime offers. An override must be offered. Otherwise the pin,
 * when offered. Otherwise only Grok, whose CLI offers what the user's plan includes, falls back to its first offered
 * model; Claude and Codex fail. Any miss throws with the available list.
 */
export const chooseLiveModel = (
  name: string, pin: string, available: readonly string[], override?: string,
): LiveModelChoice => {
  const notOffered = (model: string) => new Error(`${name} model ${model} is not offered; available: ${available.join(", ")}`);
  if (available.length === 0) throw notOffered(override || pin);
  if (override) {
    if (!available.includes(override)) throw notOffered(override);
    return { model: override };
  }
  if (available.includes(pin)) return { model: pin };
  if (name === "grok") return { model: available[0]!, fallbackFrom: pin };
  throw notOffered(pin);
};
