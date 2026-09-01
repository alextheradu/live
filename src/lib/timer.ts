import { countApprovedHours, getTimerAdjustmentMinutes } from "./airtable";

// Shared source of truth for the livestream countdown, used by the public
// /api/obs/timer route (OBS overlay + homepage) and the /admin/timer dashboard.
//
// deadline = STREAM_START_AT
//          + TIMER_INITIAL_MINUTES
//          + approvedHours * TIMER_MINUTES_PER_HOUR   (live from Airtable)
//          + adjustmentMinutes                        (stored manual offset)
//
// See add-admin-timer-control/design.md Decision 1 — this supersedes
// add-obs-overlays Decision 1 for the manual-adjustment term only; approved
// hours stay a pure live read.

export type TimerState = {
  adjustmentMinutes: number;
  deadline: string;
  approvedHours: number;
  initialMinutes: number;
  minutesPerHour: number;
  streamStartAt: string;
};

export class StreamNotConfiguredError extends Error {
  constructor() {
    super("stream_not_configured");
    this.name = "StreamNotConfiguredError";
  }
}

export async function getTimerState(): Promise<TimerState> {
  const streamStartAt = process.env.STREAM_START_AT;
  const initialMinutes = Number(process.env.TIMER_INITIAL_MINUTES ?? 0);
  const minutesPerHour = Number(process.env.TIMER_MINUTES_PER_HOUR ?? 0);

  if (!streamStartAt || Number.isNaN(new Date(streamStartAt).getTime())) {
    throw new StreamNotConfiguredError();
  }

  const [approvedHours, adjustmentMinutes] = await Promise.all([
    countApprovedHours(),
    // Best-effort: a missing config table degrades to 0 so the overlay never
    // goes blank. Write failures are surfaced separately on the admin POST path.
    getTimerAdjustmentMinutes().catch((err) => {
      console.warn(
        "[timer] getTimerAdjustmentMinutes failed (config table may not exist yet)",
        err,
      );
      return 0;
    }),
  ]);

  const deadline = new Date(
    new Date(streamStartAt).getTime() +
      initialMinutes * 60_000 +
      approvedHours * minutesPerHour * 60_000 +
      adjustmentMinutes * 60_000,
  );

  return {
    adjustmentMinutes,
    deadline: deadline.toISOString(),
    approvedHours,
    initialMinutes,
    minutesPerHour,
    streamStartAt,
  };
}
