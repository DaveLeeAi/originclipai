/**
 * End-to-end test script for the OriginClipAI pipeline.
 *
 * Usage:
 *   npx tsx scripts/process.ts <youtube-url>
 *   npx tsx scripts/process.ts https://youtube.com/watch?v=dQw4w9WgXcQ
 *
 * Requires:
 *   - Next.js dev server running (npm run dev)
 *   - Worker processes running (npm run workers)
 *   - All environment variables configured
 */

const API_BASE = process.env.API_BASE ?? "http://localhost:3000/api/v1";
const USER_ID = process.env.DEFAULT_USER_ID ?? "";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 600_000; // 10 minutes

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx scripts/process.ts <youtube-url>");
    process.exit(1);
  }

  if (!USER_ID) {
    console.error("DEFAULT_USER_ID environment variable is required");
    process.exit(1);
  }

  console.log(`\n--- OriginClipAI Pipeline Test ---`);
  console.log(`URL: ${url}`);
  console.log(`API: ${API_BASE}`);
  console.log(`User: ${USER_ID}\n`);

  // Step 1: Create job
  console.log("1. Creating job...");
  const createRes = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": USER_ID,
    },
    body: JSON.stringify({
      sourceType: "youtube_url",
      sourceUrl: url,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error(`   Failed to create job: ${createRes.status} ${err}`);
    process.exit(1);
  }

  const { jobId } = (await createRes.json()) as { jobId: string };
  console.log(`   Job created: ${jobId}\n`);

  // Step 2: Poll for completion
  console.log("2. Polling for completion...");
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const statusRes = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: { "x-user-id": USER_ID },
    });

    if (!statusRes.ok) {
      console.error(`   Status check failed: ${statusRes.status}`);
      process.exit(1);
    }

    const job = (await statusRes.json()) as {
      status: string;
      currentStep: string | null;
      error: string | null;
      clipCount: number;
      textOutputCount: number;
      sourceTitle: string | null;
    };

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `   [${elapsed}s] Status: ${job.status} | Step: ${job.currentStep ?? "-"}`,
    );

    if (job.status === "complete") {
      console.log(
        `\n   Job complete! Title: ${job.sourceTitle ?? "Unknown"}`,
      );
      console.log(
        `   Clips: ${job.clipCount} | Text outputs: ${job.textOutputCount}\n`,
      );
      break;
    }

    if (job.status === "failed") {
      console.error(`\n   Job failed: ${job.error}\n`);
      process.exit(1);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Step 3: Fetch clips
  console.log("3. Fetching clips...");
  const clipsRes = await fetch(`${API_BASE}/jobs/${jobId}/clips`, {
    headers: { "x-user-id": USER_ID },
  });
  const { clips } = (await clipsRes.json()) as {
    clips: {
      id: string;
      title: string;
      score: number;
      startTime: number;
      endTime: number;
      duration: number;
      speakerRole: string;
    }[];
  };

  console.log(`   Found ${clips.length} clips:\n`);
  for (const clip of clips.slice(0, 10)) {
    console.log(
      `   [${clip.score}] "${clip.title}" (${Math.round(clip.duration)}s, ${clip.speakerRole})`,
    );
  }

  // Step 4: Fetch text outputs
  console.log("\n4. Fetching text outputs...");
  const textsRes = await fetch(`${API_BASE}/jobs/${jobId}/texts`, {
    headers: { "x-user-id": USER_ID },
  });
  const { texts } = (await textsRes.json()) as {
    texts: {
      id: string;
      type: string;
      label: string;
      wordCount: number;
    }[];
  };

  console.log(`   Found ${texts.length} text outputs:\n`);
  for (const text of texts) {
    console.log(`   [${text.type}] "${text.label}" (${text.wordCount} words)`);
  }

  console.log("\n--- Pipeline test complete! ---\n");
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
