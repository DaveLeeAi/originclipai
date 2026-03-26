// src/app/(dashboard)/settings/connections/page.tsx
'use client';

import { useSocialConnections } from '@/lib/hooks/use-jobs';
import { ConnectionsManager } from '@/components/settings/connections-manager';

export default function ConnectionsPage() {
  const { connections } = useSocialConnections();

  // Handlers are no-ops until OAuth integration ships in v1
  const noop = () => {};

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Connected Platforms</h1>
        <p className="text-sm text-muted-foreground">Connect your social accounts for scheduling</p>
      </div>
      <div className="max-w-2xl">
        <ConnectionsManager
          connections={connections}
          onConnect={noop}
          onDisconnect={noop}
          onReconnect={noop}
        />
      </div>
    </div>
  );
}
