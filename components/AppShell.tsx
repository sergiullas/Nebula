import { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="screen-shell">
      <main className="screen-content">{children}</main>
    </div>
  );
}
