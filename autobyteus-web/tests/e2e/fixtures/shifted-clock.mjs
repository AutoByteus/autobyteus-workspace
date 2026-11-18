// Test-only preload for a probe's own spawned server (autobyteus-426 REQ-021, D-21): its clock shows a chosen day.
// Usage: node --import <this file> dist/app.js …, with AUTOBYTEUS_E2E_CLOCK_START=<ISO instant> in the environment.
// Only `Date.now()` and `new Date()` / `Date()` without arguments move: by a fixed offset taken at load, so the clock
// keeps running (timeouts and deadline loops still measure elapsed time). `new Date(value)`, `Date.UTC`, `Date.parse`,
// `instanceof Date` and every Date method are unchanged. Never loaded by product code.

const start = process.env.AUTOBYTEUS_E2E_CLOCK_START;
const startMs = start ? Date.parse(start) : Number.NaN;
if (!Number.isFinite(startMs)) throw new Error(`shifted-clock: AUTOBYTEUS_E2E_CLOCK_START must be an ISO instant, got ${String(start)}`);

const RealDate = Date;
const offsetMs = startMs - RealDate.now();
const shiftedNow = () => RealDate.now() + offsetMs;

function ShiftedDate(...args) {
  if (!new.target) return new RealDate(shiftedNow()).toString();
  return Reflect.construct(RealDate, args.length === 0 ? [shiftedNow()] : args, new.target);
}
Object.setPrototypeOf(ShiftedDate, RealDate);
ShiftedDate.prototype = RealDate.prototype;
ShiftedDate.now = shiftedNow;

globalThis.Date = ShiftedDate;
