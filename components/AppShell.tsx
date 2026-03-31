'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { mockApplications } from './data';
import { buildSharedActions } from './actions';

type AppShellProps = {
  children: ReactNode;
  currentPath?: string;
};

type PendingAction = {
  label: string;
  description: string;
};

const navItems = [
  { href: '/', label: 'My Applications' },
  { href: '/catalog', label: 'Catalog' },
];

export function AppShell({ children, currentPath }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  const activePath = pathname ?? currentPath ?? '/';
  const activeApp = useMemo(() => {
    const appPathMatch = activePath.match(/^\/app\/([^/]+)/);
    if (!appPathMatch) {
      return undefined;
    }

    return mockApplications.find((app) => app.id === appPathMatch[1]);
  }, [activePath]);

  const currentEnvironment = activeApp?.environments.includes('prod') ? 'prod' : activeApp?.environments[0] ?? 'none';

  const paletteItems = useMemo(() => {
    const actions = buildSharedActions(activeApp);
    const appNavigation = mockApplications.map((app) => ({
      id: `nav-${app.id}`,
      label: `Navigate to ${app.name}`,
      description: `${app.organization} · ${app.provider}`,
      type: 'navigation' as const,
      onSelect: () => {
        router.push(`/app/${app.id}`);
        setIsPaletteOpen(false);
      },
    }));

    const actionItems = actions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      type: 'action' as const,
      onSelect: () => {
        setPendingAction({ label: action.label, description: action.description });
        setIsPaletteOpen(false);
      },
      incidentPriority: action.incidentPriority && activeApp?.activeIncident,
      requiresApplication: action.requiresApplication,
    }));

    const ordered = [
      ...actionItems.filter((item) => item.incidentPriority),
      ...actionItems.filter((item) => !item.incidentPriority),
      ...appNavigation,
    ];

    if (!query) {
      return ordered;
    }

    const normalized = query.toLowerCase();
    return ordered.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [activeApp, query, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isPaletteOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }

      if (!isPaletteOpen) {
        return;
      }

      if (event.key === 'Escape') {
        setIsPaletteOpen(false);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, Math.max(paletteItems.length - 1, 0)));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      }

      if (event.key === 'Enter') {
        const item = paletteItems[selectedIndex];
        if (!item) {
          return;
        }

        item.onSelect();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaletteOpen, paletteItems, selectedIndex]);

  const confirmAction = () => {
    if (!pendingAction) {
      return;
    }

    const appName = activeApp?.name ?? 'No application selected';
    const timestamp = new Date().toISOString();

    setAuditTrail((current) => [
      `${pendingAction.label} · ${appName} · ${currentEnvironment} · Devin · ${timestamp}`,
      ...current,
    ]);

    if (pendingAction.label === 'Navigate to application' && !activeApp && mockApplications[0]) {
      router.push(`/app/${mockApplications[0].id}`);
    }

    if (pendingAction.label === 'Open AI companion' && activeApp) {
      router.push(`/app/${activeApp.id}?openAi=true`);
    }

    setPendingAction(null);
  };

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">Cloud Brokerage Portal</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link className={`nav-link ${activePath === item.href ? 'active' : ''}`} key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="screen-shell">
        <main className="screen-content">{children}</main>
      </div>

      {isPaletteOpen && (
        <section className="palette-overlay" role="dialog" aria-label="Command palette">
          <div className="palette-panel">
            <div className="palette-input-row">
              <span className="pill env-pill">{activeApp?.name ?? 'My Applications'}</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands"
                className="palette-input"
              />
            </div>
            <div className="palette-results">
              {paletteItems.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`palette-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={item.onSelect}
                >
                  <span className="palette-item-label">{item.label}</span>
                  <span className="palette-item-description">{item.description}</span>
                  {'requiresApplication' in item && item.requiresApplication && !activeApp && (
                    <span className="palette-item-hint">Select an application first</span>
                  )}
                </button>
              ))}
            </div>
            <footer className="palette-footer">↑↓ Navigate · Enter Select · Esc Close · ACME · Devin</footer>
          </div>
        </section>
      )}

      {pendingAction && (
        <section className="confirm-overlay" role="dialog" aria-label="Confirm action">
          <div className="confirm-modal">
            <h2>Confirm action</h2>
            <p>{pendingAction.description}</p>
            <p>
              <strong>Application:</strong> {activeApp?.name ?? 'No application selected'}
            </p>
            <p>
              <strong>Environment:</strong> {currentEnvironment}
            </p>
            <p>
              <strong>Actor:</strong> Devin
            </p>
            <div className="confirm-actions">
              <button type="button" className="incident-button" onClick={confirmAction}>
                Confirm
              </button>
              <button type="button" className="incident-button secondary" onClick={() => setPendingAction(null)}>
                Cancel
              </button>
            </div>
            {auditTrail.length > 0 && <p className="palette-audit">Last action: {auditTrail[0]}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
