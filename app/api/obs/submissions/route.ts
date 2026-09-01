import { NextResponse } from "next/server";
import { listSubmissionsCreatedAfter, SUBMISSION_FIELDS } from "../../../../src/lib/airtable";

// Unauthenticated on purpose — see app/api/obs/timer/route.ts.
export const dynamic = "force-dynamic";

const BACKFILL_MAX_RECORDS = 20;

export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since");

  const records = await listSubmissionsCreatedAfter(
    since,
    since ? {} : { maxRecords: BACKFILL_MAX_RECORDS },
  );

  const items = records.map((record) => {
    const hours = record.fields[SUBMISSION_FIELDS.overrideHours];
    return {
      githubUsername: String(record.fields[SUBMISSION_FIELDS.githubUsername] ?? ""),
      hoursClaimed: typeof hours === "number" ? hours : null,
      submittedAt: record.createdTime ?? null,
    };
  });

  return NextResponse.json(items);
}
