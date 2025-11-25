import type { NeedKey } from "../types";

export function applyDecay(
  needs: Record<NeedKey, number>,
  decayPerMs: number,
  elapsedMs: number
): Record<NeedKey, number> {
  const decayAmount = elapsedMs * decayPerMs;
  const nextNeeds: Record<NeedKey, number> = { ...needs };
  (Object.keys(nextNeeds) as NeedKey[]).forEach((key) => {
    nextNeeds[key] = Math.max(0, nextNeeds[key] - decayAmount);
  });
  return nextNeeds;
}

export function getDecayPerMs(decayPerTick: number, tickMs: number) {
  return decayPerTick / tickMs;
}
