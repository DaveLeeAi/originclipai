// src/app/(dashboard)/settings/api-keys/page.tsx
'use client';

import { useApiKeys, useUsage } from '@/lib/hooks/use-jobs';
import { ApiKeysManager } from '@/components/settings/api-keys-manager';

export default function ApiKeysPage() {
  const { keys, refresh } = useApiKeys();
  const { plan } = useUsage();
  const hasApiAccess = plan === 'pro' || plan === 'business';

  const handleCreateKey = async (name: string) => {
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    refresh();
    return { key: data.key };
  };

  const handleRevokeKey = async (id: string) => {
    await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">Manage your API keys for headless access</p>
      </div>
      <div className="max-w-2xl">
        <ApiKeysManager
          keys={keys}
          plan={plan}
          hasApiAccess={hasApiAccess}
          onCreateKey={handleCreateKey}
          onRevokeKey={handleRevokeKey}
        />
      </div>
    </div>
  );
}
