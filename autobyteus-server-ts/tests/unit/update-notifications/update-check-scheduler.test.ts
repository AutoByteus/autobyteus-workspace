import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_TICK_DELAY_MS,
  TICK_INTERVAL_MS,
  UpdateCheckScheduler,
} from "../../../src/update-notifications/services/update-check-scheduler.js";

describe("UpdateCheckScheduler (DS-007)", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("runs the first pass a minute plus a random part of a minute after start (REQ-003)", async () => {
    const pass = { run: vi.fn(async () => undefined) };
    const scheduler = new UpdateCheckScheduler({ pass, random: () => 0.5 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS * 1.5 - 1);
    expect(pass.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(pass.run).toHaveBeenCalledOnce();
    scheduler.close();
  });

  it("ticks every minute after the previous pass finished, so passes never overlap", async () => {
    let finish!: () => void;
    let running = 0;
    let overlapped = false;
    const pass = { run: vi.fn(() => {
      running++;
      if (running > 1) overlapped = true;
      return new Promise<void>((resolve) => { finish = () => { running--; resolve(); }; });
    }) };
    const scheduler = new UpdateCheckScheduler({ pass, random: () => 0 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS);
    expect(pass.run).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS * 5); // The pass is still running.
    expect(pass.run).toHaveBeenCalledOnce();
    finish();
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS - 1);
    expect(pass.run).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(pass.run).toHaveBeenCalledTimes(2);
    expect(overlapped).toBe(false);
    finish();
    scheduler.close();
  });

  it("logs a failing pass and keeps ticking", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const pass = { run: vi.fn(async () => { throw new Error("boom"); }) };
    const scheduler = new UpdateCheckScheduler({ pass, random: () => 0 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS + TICK_INTERVAL_MS);
    expect(pass.run).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("UPDATE_PASS_FAILED", expect.any(Error));
    scheduler.close();
  });

  it("close() stops further ticks, also when it comes during a pass", async () => {
    let finish!: () => void;
    const pass = { run: vi.fn(() => new Promise<void>((resolve) => { finish = resolve; })) };
    const scheduler = new UpdateCheckScheduler({ pass, random: () => 0 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS);
    scheduler.close();
    finish();
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS * 10);
    expect(pass.run).toHaveBeenCalledOnce();

    const idle = { run: vi.fn(async () => undefined) };
    const never = new UpdateCheckScheduler({ pass: idle, random: () => 0 });
    never.start();
    never.close();
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS * 3);
    expect(idle.run).not.toHaveBeenCalled();
  });
});
