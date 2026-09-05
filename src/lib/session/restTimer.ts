/**
 * Rest timer — Master Prompt §6.6 / §6.14.
 * Remaining time is always derived from a stored end-timestamp so a
 * backgrounded tab or locked screen cannot drift the countdown.
 */

export function restEndsAtIso(durationSec: number, nowMs: number): string {
  return new Date(nowMs + Math.max(0, durationSec) * 1000).toISOString();
}

export function remainingRestSec(endsAt: string | null, nowMs: number): number {
  if (!endsAt) return 0;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - nowMs) / 1000));
}

/** Starting a new rest always replaces the previous one (§6.6). */
export function replaceRest(
  durationSec: number,
  nowMs: number,
): { restEndsAt: string; restDurationSec: number } {
  return {
    restEndsAt: restEndsAtIso(durationSec, nowMs),
    restDurationSec: durationSec,
  };
}

export function extendRest(
  currentEndsAt: string | null,
  extraSec: number,
  nowMs: number,
): string {
  const current = currentEndsAt ? Date.parse(currentEndsAt) : NaN;
  const base = Number.isFinite(current) && current > nowMs ? current : nowMs;
  return new Date(base + extraSec * 1000).toISOString();
}

export function restDurationSec(
  isCompound: boolean,
  defaults: { compoundSec: number; isolationSec: number },
): number {
  return isCompound ? defaults.compoundSec : defaults.isolationSec;
}

export function formatRestClock(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
