import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { logFeedback } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { id, article_text, metadata, rating, corrections } = await req.json();

    if (!article_text) {
      return NextResponse.json({ error: "Article text is required" }, { status: 400 });
    }

    const feedbackId = id || `fb_${Date.now()}`;
    const feedbackDir = path.join(process.cwd(), "evals/feedback_store");
    
    // Ensure dir exists
    await mkdir(feedbackDir, { recursive: true });

    const feedbackData = {
      id: feedbackId,
      article_text,
      metadata,
      rating, // 'positive', 'negative', 'neutral'
      corrections, // optional list of improvements
      timestamp: new Date().toISOString()
    };

    const filePath = path.join(feedbackDir, `${feedbackId}.json`);
    await writeFile(filePath, JSON.stringify(feedbackData, null, 2));

    try {
      logFeedback({
        id: feedbackId,
        article_text: article_text,
        metadata: metadata,
        rating: rating,
        corrections: corrections,
        timestamp: feedbackData.timestamp
      });
    } catch (dbErr) {
      console.error("Failed to write feedback to DB:", dbErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Feedback captured successfully",
      id: feedbackId
    });
  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save feedback" },
      { status: 500 }
    );
  }
}
