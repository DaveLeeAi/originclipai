// src/components/settings/connections-manager.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlatformIcon, StatusDot } from '@/components/ui/badge';

export interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string;
  platformAvatarUrl?: string;
  isActive: boolean;
  lastUsedAt?: Date;
  error?: string;
}

interface ConnectionsManagerProps {
  connections: SocialConnection[];
  onConnect: (platform: string) => void;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
}

const PLATFORMS = [
  {
    key: 'youtube',
    name: 'YouTube',
    description: 'Upload Shorts directly to your channel',
    color: '#dc2626',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    description: 'Post clips with captions',
    color: '#000000',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    description: 'Publish text posts to your profile',
    color: '#0a66c2',
  },
  {
    key: 'x',
    name: 'X / Twitter',
    description: 'Post tweets and threads',
    color: '#1a1a1a',
  },
];

export function ConnectionsManager({
  connections,
  onConnect,
  onDisconnect,
  onReconnect,
}: ConnectionsManagerProps) {
  return (
    <div className="space-y-3">
      {PLATFORMS.map((platform) => {
        const connection = connections.find(
          (c) => c.platform.toLowerCase() === platform.key,
        );

        return (
          <Card key={platform.key} className="flex items-center gap-4 p-4">
            {/* Platform icon */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: platform.color }}
            >
              <PlatformIcon platform={platform.key} size={20} className="text-white" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="text-sm font-bold">{platform.name}</div>
              {connection ? (
                <div className="flex items-center gap-2 text-xs">
                  <StatusDot status={connection.isActive ? 'approved' : 'failed'} />
                  <span className={connection.isActive ? 'text-[#6b6960]' : 'text-[#dc2626]'}>
                    {connection.isActive
                      ? `Connected as @${connection.platformUsername}`
                      : connection.error ?? 'Connection broken'}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-[#a09e96]">{platform.description}</div>
              )}
            </div>

            {/* Action */}
            {connection ? (
              <div className="flex gap-2">
                {!connection.isActive && (
                  <Button
                    variant="accent-outline"
                    size="sm"
                    onClick={() => onReconnect(connection.id)}
                  >
                    Reconnect
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDisconnect(connection.id)}
                  className="text-[#dc2626] hover:bg-[#dc2626]/[0.04]"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onConnect(platform.key)}
              >
                Connect
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
