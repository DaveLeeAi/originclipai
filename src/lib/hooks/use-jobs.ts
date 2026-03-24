// src/lib/hooks/use-jobs.ts
'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// --- JOBS ---

export function useJobs() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/jobs', fetcher, {
    refreshInterval: 10_000, // Poll every 10s for active jobs
  });

  return {
    jobs: data?.jobs ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useJob(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    jobId ? `/api/v1/jobs/${jobId}` : null,
    fetcher,
    { refreshInterval: 3_000 }, // Poll frequently for active jobs
  );

  return {
    job: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}

// --- CLIPS ---

export function useClips(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    jobId ? `/api/v1/jobs/${jobId}/clips` : null,
    fetcher,
  );

  return {
    clips: data?.clips ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useUpdateClip() {
  const { trigger, isMutating } = useSWRMutation(
    'clip-update',
    async (_key: string, { arg }: { arg: { clipId: string; status: string } }) => {
      const res = await fetch(`/api/v1/clips/${arg.clipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: arg.status }),
      });
      if (!res.ok) throw new Error('Failed to update clip');
      return res.json();
    },
  );

  return { updateClip: trigger, isUpdating: isMutating };
}

// --- TEXT OUTPUTS ---

export function useTextOutputs(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    jobId ? `/api/v1/jobs/${jobId}/texts` : null,
    fetcher,
  );

  return {
    textOutputs: data?.texts ?? data?.textOutputs ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useRefineText() {
  const { trigger, isMutating } = useSWRMutation(
    'text-refine',
    async (_key: string, { arg }: { arg: { textId: string; instruction: string } }) => {
      const res = await fetch(`/api/v1/texts/${arg.textId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: arg.instruction }),
      });
      if (!res.ok) throw new Error('Failed to refine text');
      return res.json();
    },
  );

  return { refineText: trigger, isRefining: isMutating };
}

// --- USAGE ---

export function useUsage() {
  const { data, error, isLoading } = useSWR('/api/v1/usage', fetcher, {
    refreshInterval: 60_000, // Poll every minute
  });

  return {
    minutesUsed: data?.minutesUsed ?? 0,
    minutesLimit: data?.minutesLimit ?? 30,
    minutesRemaining: data?.minutesRemaining ?? 30,
    percentUsed: data?.percentUsed ?? 0,
    plan: data?.plan ?? 'free',
    isLoading,
    error,
  };
}

// --- SCHEDULED POSTS ---

export function useScheduledPosts() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/schedule', fetcher, {
    refreshInterval: 30_000,
  });

  return {
    posts: data?.posts ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// --- SOCIAL CONNECTIONS ---

export function useSocialConnections() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/connections', fetcher);

  return {
    connections: data?.connections ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// --- API KEYS ---

export function useApiKeys() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/api-keys', fetcher);

  return {
    keys: data?.keys ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// --- PROMPT TEMPLATES ---

export function usePromptTemplates() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/templates', fetcher);

  return {
    templates: data?.templates ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
