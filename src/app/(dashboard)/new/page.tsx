// src/app/(dashboard)/new/page.tsx

import { IngestForm } from '@/components/ingest/ingest-form';

export const metadata = {
  title: 'New Job — OriginClipAI',
};

export default function NewJobPage() {
  return <IngestForm />;
}
