/**
 * Worker process entry point.
 * Starts all BullMQ workers and handles graceful shutdown.
 *
 * Usage:
 *   npm run workers       — start all workers
 *   npm run workers:dev   — start with hot reload (tsx watch)
 */

import { ingestWorker } from "./ingest";
import { transcribeWorker } from "./transcribe";
import { analyzeWorker } from "./analyze";
import { renderWorker } from "./render";

const workers = [ingestWorker, transcribeWorker, analyzeWorker, renderWorker];

console.log(
  `OriginClipAI workers started: ${workers.map((w) => w.name).join(", ")}`,
);

async function shutdown(): Promise<void> {
  console.log("Shutting down workers...");
  await Promise.all(
    workers.map((w) =>
      w.close().catch((err) => {
        console.error(`Error closing worker ${w.name}:`, err);
      }),
    ),
  );
  console.log("All workers stopped.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Keep process alive
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in worker process:", error);
  // Don't exit — let BullMQ handle the failed job
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in worker process:", reason);
});
