import { NextResponse } from "next/server";
import { getTimerState, StreamNotConfiguredError } from "../../../../src/lib/timer";

// Unauthenticated on purpose — OBS Browser Sources can't complete an OAuth
// redirect or hold a login session (see design.md Decision 2).
export const dynamic = "force-dynamic";

export async function GET() {
  let state;
  try {
    state = await getTimerState();
  } catch (err) {
    if (err instanceof StreamNotConfiguredError) {
      return NextResponse.json({ error: "stream_not_configured" }, { status: 503 });
    }
    throw err;
  }

  return NextResponse.json({
    deadline: state.deadline,
    approvedHours: state.approvedHours,
    adjustmentMinutes: state.adjustmentMinutes,
  });
}
