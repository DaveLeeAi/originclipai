// src/app/(dashboard)/jobs/[id]/review/page.tsx
import { ReviewClient } from './review-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  return <ReviewClient jobId={id} />;
}
