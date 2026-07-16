import { NextRequest, NextResponse } from "next/server";
import { answerFollowUp } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportContext, history, question } = body as {
      reportContext: string;
      history: ChatMessage[];
      question: string;
    };

    if (!question || !reportContext) {
      return NextResponse.json(
        { error: "Missing 'question' or 'reportContext'" },
        { status: 400 }
      );
    }

    const answer = await answerFollowUp(reportContext, history ?? [], question);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: "Scout couldn't process that follow-up question right now." },
      { status: 500 }
    );
  }
}
