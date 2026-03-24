// src/components/onboarding/onboarding-wrapper.tsx
'use client';

import { useState } from 'react';
import { OnboardingFlow } from './onboarding-flow';

interface OnboardingWrapperProps {
  userName?: string;
}

export function OnboardingWrapper({ userName }: OnboardingWrapperProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleComplete = async () => {
    setDismissed(true);
    // Persist onboarding completion — fire and forget
    fetch('/api/v1/onboarding/complete', { method: 'POST' }).catch(() => {});
  };

  return <OnboardingFlow userName={userName} onComplete={handleComplete} />;
}
