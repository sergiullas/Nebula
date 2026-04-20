'use client';

import { ReactNode } from 'react';
import { ActionExecutionProvider } from '@/components/execution';

export function Providers({ children }: { children: ReactNode }) {
  return <ActionExecutionProvider>{children}</ActionExecutionProvider>;
}
