// scripts/seed-demo.ts
//
// Seeds the database with one fully completed demo job.
// Creates: profile, job, transcript, clips, text outputs (insights, quotes, posts, threads, etc.)
// The review UI is fully testable from this seeded data alone — no API calls needed.
//
// Usage:
//   npx tsx scripts/seed-demo.ts
//
// Requires: DATABASE_URL set in .env.local

import { PrismaClient } from "@prisma/client";
import {
  DEMO_SOURCE,
  DEMO_SPEAKERS,
  DEMO_SEGMENTS,
  DEMO_WORD_TIMESTAMPS,
  DEMO_FULL_TEXT,
  DEMO_CLIPS,
  DEMO_SUMMARY,
  DEMO_LINKEDIN_POSTS,
  DEMO_X_THREADS,
  DEMO_NEWSLETTER_SECTIONS,
  DEMO_CHAPTER_MARKERS,
  DEMO_KEY_INSIGHTS,
  DEMO_NOTABLE_QUOTES,
} from "../src/lib/fixtures/demo-job";

const prisma = new PrismaClient();

const DEV_USER_ID = process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL ?? "dev@localhost";

async function main(): Promise<void> {
  console.log("🌱 Seeding demo data...\n");

  // 1. Upsert dev profile
  const profile = await prisma.profile.upsert({
    where: { id: DEV_USER_ID },
    create: {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      plan: "pro",
      minutesLimit: 900,
      onboardingComplete: true,
    },
    update: {
      plan: "pro",
      minutesLimit: 900,
      onboardingComplete: true,
    },
  });
  console.log(`✅ Profile: ${profile.email} (${profile.id})`);

  // 2. Create the completed demo job
  const job = await prisma.job.create({
    data: {
      userId: DEV_USER_ID,
      sourceType: "youtube_url",
      sourceUrl: DEMO_SOURCE.url,
      sourceTitle: DEMO_SOURCE.title,
      sourceDurationSeconds: DEMO_SOURCE.durationSeconds,
      sourceMetadata: {
        title: DEMO_SOURCE.title,
        description: DEMO_SOURCE.description,
        thumbnail: DEMO_SOURCE.thumbnail,
        author: DEMO_SOURCE.author,
        durationSeconds: DEMO_SOURCE.durationSeconds,
      },
      status: "complete",
      clipCount: DEMO_CLIPS.length,
      textOutputCount: 0, // Will be updated after inserts
      minutesConsumed: DEMO_SOURCE.durationSeconds / 60,
      processingStartedAt: new Date(Date.now() - 120_000),
      processingCompletedAt: new Date(),
      progress: {
        ingest: "complete",
        transcribe: "complete",
        analyze: "complete",
        render: "skipped",
      },
    },
  });
  console.log(`✅ Job: ${job.id} — "${DEMO_SOURCE.title}"`);

  // 3. Create transcript
  const transcript = await prisma.transcript.create({
    data: {
      jobId: job.id,
      fullText: DEMO_FULL_TEXT,
      language: "en",
      segments: JSON.parse(JSON.stringify(DEMO_SEGMENTS)),
      speakers: JSON.parse(JSON.stringify(DEMO_SPEAKERS)),
      wordTimestamps: JSON.parse(JSON.stringify(DEMO_WORD_TIMESTAMPS)),
      engine: "assemblyai",
      durationSeconds: DEMO_SOURCE.durationSeconds,
      wordCount: DEMO_FULL_TEXT.split(/\s+/).length,
      confidenceAvg: 0.95,
    },
  });
  console.log(`✅ Transcript: ${transcript.id} (${transcript.wordCount} words, ${DEMO_SEGMENTS.length} segments)`);

  // 4. Create clips
  let clipOrder = 0;
  for (const clip of DEMO_CLIPS) {
    await prisma.clip.create({
      data: {
        jobId: job.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        title: clip.title,
        hook: clip.hook,
        transcriptExcerpt: clip.transcriptExcerpt,
        score: clip.score,
        scoreFactors: JSON.parse(JSON.stringify(clip.scoreFactors)),
        primarySpeakerId: clip.primarySpeakerId,
        speakerRole: clip.speakerRole,
        speakersPresent: JSON.parse(JSON.stringify(clip.speakersPresent)),
        socialCaption: clip.socialCaption,
        hashtags: JSON.parse(JSON.stringify(clip.hashtags)),
        status: "review",
        renderStatus: "pending",
        sortOrder: clipOrder++,
      },
    });
  }
  console.log(`✅ Clips: ${DEMO_CLIPS.length} clip candidates`);

  // 5. Create text outputs
  let textOrder = 0;
  const textOutputs: Array<{
    type: string;
    label: string;
    content: string;
    wordCount: number;
    threadPosts?: unknown;
    metadata?: Record<string, unknown>;
  }> = [];

  // Summary
  textOutputs.push({
    type: "summary",
    label: "Summary",
    content: DEMO_SUMMARY,
    wordCount: DEMO_SUMMARY.split(/\s+/).length,
    metadata: { source: "intelligence_layer" },
  });

  // Key insights
  for (const insight of DEMO_KEY_INSIGHTS) {
    textOutputs.push({
      type: "key_insight",
      label: insight.tags[0] ? `Insight: ${insight.tags[0]}` : "Key Insight",
      content: insight.insight,
      wordCount: insight.insight.split(/\s+/).length,
      metadata: {
        significance: insight.significance,
        speakerId: insight.speakerId,
        approximateTimestamp: insight.approximateTimestamp,
        tags: insight.tags,
        confidence: insight.confidence,
        source: "intelligence_layer",
      },
    });
  }

  // Notable quotes
  for (const quote of DEMO_NOTABLE_QUOTES) {
    textOutputs.push({
      type: "notable_quote",
      label: `Quote: ${quote.speakerLabel ?? quote.speakerId}`,
      content: quote.quote,
      wordCount: quote.quote.split(/\s+/).length,
      metadata: {
        speakerId: quote.speakerId,
        speakerLabel: quote.speakerLabel,
        approximateTimestamp: quote.approximateTimestamp,
        context: quote.context,
        impact: quote.impact,
        socialReady: quote.socialReady,
        source: "intelligence_layer",
      },
    });
  }

  // LinkedIn posts
  for (const post of DEMO_LINKEDIN_POSTS) {
    textOutputs.push({
      type: "linkedin_post",
      label: post.label,
      content: post.content,
      wordCount: post.wordCount,
    });
  }

  // X threads
  for (const thread of DEMO_X_THREADS) {
    textOutputs.push({
      type: "x_thread",
      label: thread.label,
      content: thread.posts.map((p) => p.text).join("\n\n"),
      wordCount: thread.wordCount,
      threadPosts: thread.posts,
    });
  }

  // Newsletter sections
  for (const section of DEMO_NEWSLETTER_SECTIONS) {
    textOutputs.push({
      type: "newsletter_section",
      label: section.label,
      content: section.content,
      wordCount: section.wordCount,
    });
  }

  // Chapter markers
  textOutputs.push({
    type: "chapter_markers",
    label: "Chapter Markers",
    content: DEMO_CHAPTER_MARKERS,
    wordCount: DEMO_CHAPTER_MARKERS.split(/\s+/).length,
  });

  for (const output of textOutputs) {
    await prisma.textOutput.create({
      data: {
        jobId: job.id,
        type: output.type as any,
        label: output.label,
        content: output.content,
        wordCount: output.wordCount,
        threadPosts: output.threadPosts ? JSON.parse(JSON.stringify(output.threadPosts)) : undefined,
        metadata: output.metadata ? JSON.parse(JSON.stringify(output.metadata)) : {},
        status: "draft",
        sortOrder: textOrder++,
      },
    });
  }

  // Update job text output count
  await prisma.job.update({
    where: { id: job.id },
    data: { textOutputCount: textOutputs.length },
  });

  console.log(`✅ Text outputs: ${textOutputs.length} total`);
  console.log(`   • 1 summary`);
  console.log(`   • ${DEMO_KEY_INSIGHTS.length} key insights`);
  console.log(`   • ${DEMO_NOTABLE_QUOTES.length} notable quotes`);
  console.log(`   • ${DEMO_LINKEDIN_POSTS.length} LinkedIn posts`);
  console.log(`   • ${DEMO_X_THREADS.length} X threads`);
  console.log(`   • ${DEMO_NEWSLETTER_SECTIONS.length} newsletter sections`);
  console.log(`   • 1 chapter markers`);

  console.log(`\n🎉 Demo seed complete!`);
  console.log(`\n   Job ID: ${job.id}`);
  console.log(`   Review: http://localhost:3000/jobs/${job.id}/review`);
  console.log(`   Jobs:   http://localhost:3000/jobs`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
