import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { saveDemoFeedback } from "@/lib/demoLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FeedbackRequest {
  feedback?: string;
  school_name?: string;
  source?: string;
}

// Anonymous prospect feedback from the demo result page. No email required;
// the whole point is to catch the people who run the demo, don't subscribe,
// and don't leave a lead, but would be willing to drop a one-line "what's
// stopping me" if asked. That's the data /admin can't otherwise produce.
export async function POST(req: Request) {
  // Generous limit; we want feedback, but a single IP spamming it isn't useful.
  const rl = await rateLimit(req, "demo-feedback", 10, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Thanks, that's enough feedback from this IP for now." },
      { status: 429 }
    );
  }

  let body: FeedbackRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const feedback = (body.feedback || "").trim();
  if (!feedback) {
    return NextResponse.json({ error: "Empty feedback." }, { status: 400 });
  }
  if (feedback.length > 1000) {
    return NextResponse.json(
      { error: "Keep it under 1000 characters." },
      { status: 400 }
    );
  }

  await saveDemoFeedback(req, {
    feedback,
    school_name: body.school_name,
    source: body.source,
  });

  return NextResponse.json({ ok: true });
}
