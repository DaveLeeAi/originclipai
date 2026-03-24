// src/components/settings/api-keys-manager.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';

export interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
}

interface ApiKeysManagerProps {
  keys: ApiKeyItem[];
  plan: string;
  hasApiAccess: boolean;
  onCreateKey: (name: string) => Promise<{ key: string }>;
  onRevokeKey: (id: string) => void;
}

export function ApiKeysManager({
  keys,
  plan,
  hasApiAccess,
  onCreateKey,
  onRevokeKey,
}: ApiKeysManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!hasApiAccess) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e4e2dd] bg-[#f6f5f2]">
          <svg className="text-[#a09e96]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </div>
        <h3 className="mb-2 text-base font-bold">API access requires Pro or Business</h3>
        <p className="mb-5 text-sm text-[#6b6960]">
          You're on the {plan} plan. Upgrade to Pro ($39/mo) for self-serve API access with REST endpoints, webhooks, and automation integrations.
        </p>
        <Button variant="primary" size="md">
          Upgrade to Pro
        </Button>
      </Card>
    );
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const result = await onCreateKey(newKeyName.trim());
      setCreatedKey(result.key);
      setNewKeyName('');
      setShowCreate(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {/* New key reveal banner */}
      {createdKey && (
        <div className="mb-5 rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/[0.04] p-4">
          <div className="mb-2 text-sm font-bold text-[#16a34a]">API key created</div>
          <p className="mb-3 text-xs text-[#6b6960]">
            Copy this key now. You won't be able to see it again.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 rounded-lg border border-[#e4e2dd] bg-white px-3 py-2 font-mono text-xs text-[#1a1a1a]">
              {createdKey}
            </code>
            <Button size="sm" variant="secondary" onClick={handleCopyKey}>
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-xs text-[#6b6960] hover:underline"
          >
            I've saved this key — dismiss
          </button>
        </div>
      )}

      {/* Create button */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Your API keys</h3>
          <p className="text-xs text-[#a09e96]">
            Use these keys to authenticate API requests. Keys are prefixed with sk_live_.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          + New key
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-5 flex gap-2 rounded-xl border border-[#e4e2dd] bg-[#f6f5f2] p-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Key name (e.g., Production, n8n Automation)"
            className="flex-1 rounded-lg border border-[#e4e2dd] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a09e96]"
          />
          <Button size="sm" onClick={handleCreate} disabled={!newKeyName.trim() || isCreating}>
            {isCreating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-[#a09e96]">No API keys yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <Card key={key.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{key.name}</span>
                  {!key.isActive && <Badge variant="red">Revoked</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-3 font-mono text-xs text-[#a09e96]">
                  <span>{key.keyPrefix}…</span>
                  <span>·</span>
                  <span>{key.usageCount} requests</span>
                  <span>·</span>
                  <span>
                    {key.lastUsedAt
                      ? `Last used ${timeAgo(new Date(key.lastUsedAt))}`
                      : 'Never used'}
                  </span>
                </div>
              </div>
              {key.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevokeKey(key.id)}
                  className="text-[#dc2626] hover:bg-[#dc2626]/[0.04]"
                >
                  Revoke
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Docs link */}
      <div className="mt-6 rounded-xl border border-[#e4e2dd] bg-white p-4 text-center">
        <p className="text-sm text-[#6b6960]">
          Need help integrating?{' '}
          <a href="/docs/api" className="font-semibold text-[#5046e5] hover:underline">
            Read the API docs →
          </a>
        </p>
      </div>
    </div>
  );
}
