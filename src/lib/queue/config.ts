export const QUEUE_NAMES = {
  INGEST: "ingest",
  TRANSCRIBE: "transcribe",
  ANALYZE: "analyze",
  RENDER: "render",
  SCHEDULE: "schedule",
  EXPORT: "export",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

interface QueueConfig {
  name: string;
  concurrency: number;
  attempts: number;
  backoff: { type: "exponential" | "fixed"; delay: number };
  timeout: number;
}

export const QUEUE_CONFIG: Record<QueueName, QueueConfig> = {
  ingest: {
    name: "ingest",
    concurrency: 5,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    timeout: 600_000, // 10 min
  },
  transcribe: {
    name: "transcribe",
    concurrency: 3,
    attempts: 2,
    backoff: { type: "exponential", delay: 10_000 },
    timeout: 1_800_000, // 30 min
  },
  analyze: {
    name: "analyze",
    concurrency: 5,
    attempts: 3,
    backoff: { type: "exponential", delay: 3_000 },
    timeout: 300_000, // 5 min
  },
  render: {
    name: "render",
    concurrency: 3,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    timeout: 600_000, // 10 min
  },
  schedule: {
    name: "schedule",
    concurrency: 2,
    attempts: 4,
    backoff: { type: "exponential", delay: 300_000 }, // 5 min base
    timeout: 300_000,
  },
  export: {
    name: "export",
    concurrency: 3,
    attempts: 2,
    backoff: { type: "fixed", delay: 5_000 },
    timeout: 300_000,
  },
};
