import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const redis = new IORedis(process.env.REDIS_URL!);
const ingestQueue = new Queue('ingest', { connection: redis });

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: tsx scripts/enqueue-job.ts <jobId>');
  process.exit(1);
}

ingestQueue.add('ingest', {
  jobId,
  sourceType: 'article_url',
  sourceUrl: 'https://www.businessinsider.com/synthesia-general-counsel-vibe-coding-ai-lawyer-legal-agent-2026-3',
}, { jobId: `ingest-${jobId}-retry` }).then(() => {
  console.log('Enqueued job', jobId);
  return redis.quit();
}).then(() => process.exit(0)).catch((e: unknown) => { console.error(e); process.exit(1); });
