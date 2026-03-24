// src/app/(dashboard)/settings/connections/page.tsx
'use client';

import { useSocialConnections } from '@/lib/hooks/use-jobs';
import { ConnectionsManager } from '@/components/settings/connections-manager';

export default function ConnectionsPage() {
  const { connections, refresh } = useSocialConnections();

  const handleConnect = (platform: string) => {
    window.location.href = `/api/auth/${platform}/authorize`;
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`/api/v1/connections/${id}`, { method: 'DELETE' });
    refresh();
  };

  const handleReconnect = (id: string) => {
    const conn = connections.find((c: { id: string; platform: string }) => c.id === id);
    if (conn) handleConnect(conn.platform);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Connected Platforms</h1>
        <p className="text-sm text-[#6b6960]">Connect your social accounts for scheduling</p>
      </div>
      <div className="max-w-2xl">
        <ConnectionsManager
          connections={connections}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onReconnect={handleReconnect}
        />
      </div>
    </div>
  );
}
