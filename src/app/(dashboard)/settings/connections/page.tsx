'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, PlatformIcon, StatusDot } from '@/components/ui/badge';

interface Connection {
  id: string;
  platform: string;
  platformUsername: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  error: string | null;
}

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube Shorts', color: '#dc2626' },
  { key: 'tiktok', label: 'TikTok', color: '#1a1a1a' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0077b5' },
  { key: 'x', label: 'X (Twitter)', color: '#1a1a1a' },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/connections')
      .then((res) => res.json())
      .then((data) => {
        setConnections(data.connections ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleConnect = (platform: string) => {
    // Redirect to OAuth flow
    window.location.href = `/api/v1/auth/oauth/${platform}`;
  };

  const handleDisconnect = async (id: string) => {
    const res = await fetch(`/api/v1/connections/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConnections((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const getConnection = (platform: string) =>
    connections.find((c) => c.platform === platform);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Social Connections</h1>
      <p className="mb-8 text-sm text-[#6b6960]">
        Connect your social accounts to schedule posts directly.
      </p>

      <div className="max-w-[560px] space-y-3">
        {PLATFORMS.map((p) => {
          const conn = getConnection(p.key);

          return (
            <div
              key={p.key}
              className="flex items-center gap-4 rounded-2xl border border-[#e4e2dd] bg-white p-5 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f5f2]">
                <PlatformIcon platform={p.key} size={20} className="text-[#1a1a1a]" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">{p.label}</div>
                {conn ? (
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#6b6960]">
                    <StatusDot status={conn.isActive ? 'approved' : 'failed'} size="sm" />
                    <span>
                      {conn.platformUsername
                        ? `@${conn.platformUsername}`
                        : conn.isActive
                          ? 'Connected'
                          : conn.error ?? 'Connection error'}
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-[#a09e96]">Not connected</div>
                )}
              </div>
              {conn ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect(conn.id)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="accent-outline"
                  size="sm"
                  onClick={() => handleConnect(p.key)}
                  disabled={loading}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
