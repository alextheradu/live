"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 5000;
const MAX_VISIBLE = 30;

type SubmissionItem = {
  githubUsername: string;
  hoursClaimed: number | null;
  submittedAt: string | null;
};

function lineFor(item: SubmissionItem) {
  const name = item.githubUsername || "someone";
  if (item.hoursClaimed === null) return `${name} submitted a project`;
  const hourWord = item.hoursClaimed === 1 ? "hour" : "hours";
  return `${name} submitted a project for ${item.hoursClaimed} ${hourWord}`;
}

export default function ObsSubmissionsPage() {
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const cursorRef = useRef<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const url = cursorRef.current
          ? `/api/obs/submissions?since=${encodeURIComponent(cursorRef.current)}`
          : "/api/obs/submissions";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data: SubmissionItem[] = await res.json();
        if (cancelled || data.length === 0) return;

        const newest = data[data.length - 1]?.submittedAt;
        if (newest) cursorRef.current = newest;

        setItems((prev) => {
          const combined = loadedRef.current ? [...prev, ...data] : data;
          loadedRef.current = true;
          return combined.slice(-MAX_VISIBLE);
        });
      } catch {
        // Transient network hiccup — the next poll will retry.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <main
    className="bg-transparent w-screen h-screen"
    >
      {items.map((item, i) => (
        <div
          key={`${item.submittedAt ?? ""}-${i}`}
          className="font-2 text-right font-lg">
          {lineFor(item)}
        </div>
      ))}
    </main>
  );
}
