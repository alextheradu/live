"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimerState } from "../../../src/lib/timer";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(s)}`;
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

export default function TimerControls({ initialState }: { initialState: TimerState }) {
  const [state, setState] = useState(initialState);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const deadlineMs = useMemo(() => new Date(state.deadline).getTime(), [state.deadline]);
  const remaining = deadlineMs - now;
  const approvedContribution = state.approvedHours * state.minutesPerHour;

  async function apply(body: { deltaMinutes: number } | { reset: true }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ? `Request failed: ${data.error}` : `Request failed (${res.status})`);
        return;
      }
      setState(data as TimerState);
      setCustomValue("");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  function applyCustom() {
    const n = Number(customValue);
    if (!Number.isInteger(n) || n === 0) {
      setError("Enter a whole number of minutes (positive or negative).");
      return;
    }
    apply({ deltaMinutes: n });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card bg-base-200 p-6 gap-2">
        <p className="text-sm opacity-60">remaining</p>
        <p className="font-mono text-5xl">
          {remaining <= 0 ? "00:00:00" : formatRemaining(remaining)}
        </p>
        <p className="text-sm opacity-60">ends {new Date(state.deadline).toLocaleString()}</p>
      </div>

      <div className="card bg-base-200 p-6 gap-1 text-sm">
        <p className="opacity-60 mb-1">breakdown</p>
        <div className="flex justify-between">
          <span>initial</span>
          <span className="font-mono">{state.initialMinutes} min</span>
        </div>
        <div className="flex justify-between">
          <span>
            approved hours ({state.approvedHours} × {state.minutesPerHour})
          </span>
          <span className="font-mono">{approvedContribution} min</span>
        </div>
        <div className="flex justify-between">
          <span>manual adjustment</span>
          <span className="font-mono">{signed(state.adjustmentMinutes)} min</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => apply({ deltaMinutes: 20 })}
          >
            +20 min
          </button>
          <button
            className="btn btn-primary btn-outline"
            disabled={busy}
            onClick={() => apply({ deltaMinutes: -20 })}
          >
            −20 min
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => apply({ reset: true })}>
            Reset to 0
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="number"
            step="1"
            className="input input-bordered w-40"
            placeholder="± minutes"
            value={customValue}
            disabled={busy}
            onChange={(e) => setCustomValue(e.target.value)}
          />
          <button className="btn" disabled={busy} onClick={applyCustom}>
            Apply custom
          </button>
        </div>

        {busy && <p className="text-sm opacity-60">saving…</p>}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      <p className="text-xs opacity-50">
        Stored adjustment: {signed(state.adjustmentMinutes)} minutes. Changes reach the OBS
        overlay and homepage within ~5s.
      </p>
    </div>
  );
}
