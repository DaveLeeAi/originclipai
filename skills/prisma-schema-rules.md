# skills/prisma-schema-rules.md

> Prisma schema conventions for OriginClipAI. Read before creating or modifying any database schema.

---

## Schema Location

Single source of truth: `prisma/schema.prisma`

All schema changes happen here. Never write raw SQL migrations. Use `npx prisma migrate dev` to generate migrations from schema changes.

---

## Naming Conventions

```prisma
// Models: PascalCase, singular
model Job { }
model Clip { }
model TextOutput { }

// Fields: camelCase
model Job {
  id        String   @id @default(uuid())
  userId    String
  sourceUrl String?
  createdAt DateTime @default(now())
}

// Table names: snake_case (mapped from PascalCase)
model TextOutput {
  @@map("text_outputs")
}

// Enums: PascalCase name, UPPER_SNAKE values
enum JobStatus {
  CREATED
  INGESTING
  TRANSCRIBING
  ANALYZING
  RENDERING
  COMPLETE
  FAILED
  CANCELLED
}

// Relations: named by what they represent
model Job {
  clips       Clip[]
  textOutputs TextOutput[]
  transcript  Transcript?
}
```

---

## Required Fields on Every Model

Every model must have:

```prisma
model Example {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

No exceptions. No auto-incrementing integer IDs. UUIDs only.

---

## The Core Schema

This is the target schema derived from `docs/DB_SCHEMA_PLAN.md`. Translate accordingly.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

// --- Enums ---

enum SourceType {
  YOUTUBE_URL
  VIDEO_URL
  VIDEO_UPLOAD
  AUDIO_UPLOAD
  ARTICLE_URL
  PDF_UPLOAD
}

enum JobStatus {
  CREATED
  INGESTING
  TRANSCRIBING
  ANALYZING
  RENDERING
  COMPLETE
  FAILED
  CANCELLED
}

enum TranscriptionEngine {
  WHISPER
  ASSEMBLYAI
}

enum ClipStatus {
  REVIEW
  APPROVED
  REJECTED
}

enum SpeakerRole {
  HOST
  GUEST
  CO_HOST
  SOLO
  UNKNOWN
}

enum TextOutputType {
  LINKEDIN_POST
  X_THREAD
  NEWSLETTER_SECTION
  SUMMARY
  CHAPTER_MARKERS
  SOCIAL_CAPTION
  BLOG_DRAFT
  SHOW_NOTES
  CUSTOM
}

enum TextOutputStatus {
  DRAFT
  APPROVED
  SCHEDULED
  POSTED
}

enum Platform {
  YOUTUBE
  TIKTOK
  LINKEDIN
  X
  INSTAGRAM
  FACEBOOK
}

enum PostStatus {
  QUEUED
  POSTING
  POSTED
  FAILED
  CANCELLED
}

enum Plan {
  FREE
  CREATOR
  PRO
  BUSINESS
}

// --- Models ---

model Profile {
  id                   String    @id @default(uuid())
  email                String    @unique
  displayName          String?
  avatarUrl            String?
  plan                 Plan      @default(FREE)
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?
  minutesUsedThisCycle Int       @default(0)
  minutesLimit         Int       @default(30)
  billingCycleStart    DateTime?
  defaultCaptionStyle  String    @default("karaoke")
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  jobs              Job[]
  scheduledPosts    ScheduledPost[]
  socialConnections SocialConnection[]
  promptTemplates   PromptTemplate[]
  apiKeys           ApiKey[]

  @@map("profiles")
}

model Job {
  id              String     @id @default(uuid())
  userId          String
  sourceType      SourceType
  sourceUrl       String?
  sourceFileKey   String?
  sourceTitle     String?
  sourceDuration  Float?
  sourceMetadata  Json       @default("{}")
  status          JobStatus  @default(CREATED)
  currentStep     String?
  progress        Json       @default("{}")
  error           String?
  clipCount       Int        @default(0)
  textOutputCount Int        @default(0)
  minutesConsumed Float      @default(0)
  processingStartedAt   DateTime?
  processingCompletedAt DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  user        Profile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  transcript  Transcript?
  clips       Clip[]
  textOutputs TextOutput[]

  @@index([userId])
  @@index([status])
  @@index([userId, createdAt(sort: Desc)])
  @@map("jobs")
}

model Transcript {
  id              String              @id @default(uuid())
  jobId           String              @unique
  fullText        String
  language        String              @default("en")
  segments        Json                @default("[]")
  speakers        Json                @default("[]")
  wordTimestamps  Json                @default("[]")
  engine          TranscriptionEngine
  durationSeconds Float?
  wordCount       Int?
  confidenceAvg   Float?
  createdAt       DateTime            @default(now())

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("transcripts")
}

model Clip {
  id                String      @id @default(uuid())
  jobId             String
  startTime         Float
  endTime           Float
  duration          Float
  title             String
  hook              String?
  transcriptExcerpt String
  score             Int
  scoreFactors      Json        @default("{}")
  primarySpeakerId  String?
  speakerRole       SpeakerRole @default(UNKNOWN)
  speakersPresent   Json        @default("[]")
  status            ClipStatus  @default(REVIEW)
  captionStyle      String      @default("karaoke")
  renderedFiles     Json        @default("{}")
  renderStatus      String      @default("pending")
  socialCaption     String?
  hashtags          Json        @default("[]")
  sortOrder         Int         @default(0)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  job            Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  scheduledPosts ScheduledPost[]

  @@index([jobId])
  @@index([jobId, status])
  @@index([jobId, score(sort: Desc)])
  @@map("clips")
}

model TextOutput {
  id               String           @id @default(uuid())
  jobId            String
  type             TextOutputType
  label            String
  content          String
  wordCount        Int              @default(0)
  threadPosts      Json?
  status           TextOutputStatus @default(DRAFT)
  platform         Platform?
  promptTemplateId String?
  metadata         Json             @default("{}")
  sortOrder        Int              @default(0)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  job            Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  scheduledPosts ScheduledPost[]

  @@index([jobId])
  @@index([jobId, type])
  @@map("text_outputs")
}

model ScheduledPost {
  id                 String   @id @default(uuid())
  userId             String
  clipId             String?
  textOutputId       String?
  platform           Platform
  socialConnectionId String?
  scheduledAt        DateTime
  status             PostStatus @default(QUEUED)
  platformPostId     String?
  platformPostUrl    String?
  error              String?
  retryCount         Int      @default(0)
  lastRetryAt        DateTime?
  contentSnapshot    Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user             Profile           @relation(fields: [userId], references: [id], onDelete: Cascade)
  clip             Clip?             @relation(fields: [clipId], references: [id], onDelete: SetNull)
  textOutput       TextOutput?       @relation(fields: [textOutputId], references: [id], onDelete: SetNull)
  socialConnection SocialConnection? @relation(fields: [socialConnectionId], references: [id])

  @@index([userId])
  @@index([status, scheduledAt])
  @@index([clipId])
  @@index([textOutputId])
  @@map("scheduled_posts")
}

model SocialConnection {
  id               String   @id @default(uuid())
  userId           String
  platform         Platform
  platformUserId   String?
  platformUsername  String?
  platformAvatarUrl String?
  accessToken      String
  refreshToken     String?
  tokenExpiresAt   DateTime?
  scopes           Json     @default("[]")
  isActive         Boolean  @default(true)
  lastUsedAt       DateTime?
  error            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user           Profile         @relation(fields: [userId], references: [id], onDelete: Cascade)
  scheduledPosts ScheduledPost[]

  @@unique([userId, platform])
  @@index([userId])
  @@map("social_connections")
}

model PromptTemplate {
  id          String         @id @default(uuid())
  userId      String
  name        String
  outputType  TextOutputType @default(CUSTOM)
  promptText  String
  description String?
  isActive    Boolean        @default(true)
  usageCount  Int            @default(0)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("prompt_templates")
}

model ApiKey {
  id         String    @id @default(uuid())
  userId     String
  keyPrefix  String
  keyHash    String
  name       String    @default("Default")
  isActive   Boolean   @default(true)
  lastUsedAt DateTime?
  usageCount Int       @default(0)
  createdAt  DateTime  @default(now())
  revokedAt  DateTime?

  user Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([keyPrefix])
  @@map("api_keys")
}
```

---

## Schema Change Rules

1. **Add columns as optional first.** New required columns need a default value or a data migration. Never add a non-nullable column without a default to a table with existing data.

2. **Never rename columns in production.** Add the new column, migrate data, deprecate the old one, then remove it in a later migration.

3. **Json columns must have documented shapes.** Every `Json` field needs a comment or a corresponding TypeScript type in `src/types/`:

```prisma
model Job {
  /// Shape: { ingest: StepStatus, transcribe: StepStatus, analyze: StepStatus, render: StepStatus }
  progress Json @default("{}")
}
```

```typescript
// src/types/job.ts
export interface JobProgress {
  ingest: StepStatus;
  transcribe: StepStatus;
  analyze: StepStatus;
  render: StepStatus;
  details?: {
    transcribePct?: number;
    clipsRendered?: number;
    clipsTotal?: number;
    speakersFound?: number;
  };
}

export type StepStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';
```

4. **Indexes must justify their existence.** Every index corresponds to a query pattern. Document which query each index serves:

```prisma
@@index([userId, createdAt(sort: Desc)])  // Job list page: ORDER BY createdAt DESC WHERE userId = ?
@@index([status, scheduledAt])            // Schedule worker: WHERE status = 'QUEUED' ORDER BY scheduledAt
```

5. **No schema changes for v2 features.** Do not add columns, tables, or enums for features that are not in v1 scope per V1_SCOPE_RECOMMENDATION.md.

---

## Migration Workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_render_status_to_clips

# 3. Review generated SQL in prisma/migrations/
# 4. Generate client
npx prisma generate

# 5. Test
npm test

# 6. Commit schema + migration together
git add prisma/
git commit -m "feat: add render status to clips table"
```

Never edit generated migration files. If a migration is wrong, delete it and regenerate.
