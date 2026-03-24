import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";
import { QUEUE_CONFIG, QUEUE_NAMES, type QueueName } from "./config";
import type {
  IngestJobData,
  TranscribeJobData,
  AnalyzeJobData,
  RenderJobData,
  ScheduleJobData,
  ExportJobData,
} from "@/types";

const queues = new Map<string, Queue>();

function getOrCreateQueue<T>(name: QueueName): Queue<T> {
  if (!queues.has(name)) {
    const config = QUEUE_CONFIG[name];
    const queue = new Queue<T>(config.name, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: config.attempts,
        backoff: config.backoff,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name) as Queue<T>;
}

export const ingestQueue = (): Queue<IngestJobData> =>
  getOrCreateQueue<IngestJobData>(QUEUE_NAMES.INGEST);

export const transcribeQueue = (): Queue<TranscribeJobData> =>
  getOrCreateQueue<TranscribeJobData>(QUEUE_NAMES.TRANSCRIBE);

export const analyzeQueue = (): Queue<AnalyzeJobData> =>
  getOrCreateQueue<AnalyzeJobData>(QUEUE_NAMES.ANALYZE);

export const renderQueue = (): Queue<RenderJobData> =>
  getOrCreateQueue<RenderJobData>(QUEUE_NAMES.RENDER);

export const scheduleQueue = (): Queue<ScheduleJobData> =>
  getOrCreateQueue<ScheduleJobData>(QUEUE_NAMES.SCHEDULE);

export const exportQueue = (): Queue<ExportJobData> =>
  getOrCreateQueue<ExportJobData>(QUEUE_NAMES.EXPORT);
