'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';

interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  name: string;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/api-keys')
      .then((res) => res.json())
      .then((data) => {
        setKeys(data.keys ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'Default' }),
    });
    if (res.ok) {
      const data = await res.json();
      setCreatedKey(data.key);
      setKeys((prev) => [data.apiKey, ...prev]);
      setNewKeyName('');
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">API Keys</h1>
      <p className="mb-8 text-sm text-[#6b6960]">
        Manage your API keys for programmatic access. Available on Pro and Business plans.
      </p>

      {/* Create new key */}
      <div className="mb-6 max-w-[560px] rounded-2xl border border-[#e4e2dd] bg-white p-5 shadow-sm">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-[#a09e96]">
          Create new key
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production)"
            className="flex-1 rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a09e96] focus:border-[#5046e5]/40"
          />
          <Button size="md" onClick={handleCreate}>
            Create
          </Button>
        </div>

        {createdKey && (
          <div className="mt-4 rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/[0.04] p-4">
            <div className="mb-1 text-xs font-bold text-[#16a34a]">
              Key created — copy it now, it won&apos;t be shown again
            </div>
            <code className="block break-all rounded-lg bg-[#1a1a1a] px-3 py-2 font-mono text-xs text-white">
              {createdKey}
            </code>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="max-w-[560px] space-y-2">
        {loading ? (
          <p className="text-sm text-[#a09e96]">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-[#a09e96]">No API keys yet.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-4 rounded-2xl border border-[#e4e2dd] bg-white p-4 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold">{key.name}</span>
                  <Badge variant={key.isActive ? 'green' : 'muted'}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#a09e96]">
                  {key.keyPrefix}••• · {key.usageCount} requests
                  {key.lastUsedAt && ` · Last used ${timeAgo(new Date(key.lastUsedAt))}`}
                </div>
              </div>
              {key.isActive && (
                <Button variant="danger" size="sm" onClick={() => handleRevoke(key.id)}>
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
