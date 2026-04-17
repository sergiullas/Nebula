'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { mockApplications } from './data';
import { buildSharedActions } from './actions';
import { Badge } from './Badge';

type AppShellProps = {
  children: ReactNode;
  currentPath?: string;
};

type PendingAction = {
  label: string;
  description: string;
};

type NavItem = {
  href?: string;
  label: string;
  isPlaceholder?: boolean;
  matchPaths?: string[];
};

const primaryNavItems: NavItem[] = [
  { href: '/', label: 'Home', matchPaths: ['/', '/app'] },
  { href: '/catalog', label: 'Catalog', matchPaths: ['/catalog'] },
  { label: 'Governance / Insights', isPlaceholder: true },
  { label: 'Activity / Actions', isPlaceholder: true },
];

const secondaryNavItems: NavItem[] = [
  { label: 'My Group', isPlaceholder: true },
  { label: 'APIs', isPlaceholder: true },
  { label: 'Docs', isPlaceholder: true },
  { label: 'Create', isPlaceholder: true },
  { label: 'Explore', isPlaceholder: true },
  { label: 'Tech Radar', isPlaceholder: true },
  { label: 'Cost Insights', isPlaceholder: true },
  { label: 'GraphiQL', isPlaceholder: true },
  { label: 'Notifications', isPlaceholder: true },
  { label: 'Settings', isPlaceholder: true },
];

type SidebarAccountPanelProps = {
  name: string;
  role?: string;
  isCollapsed: boolean;
};

function SidebarAccountPanel({ name, role, isCollapsed }: SidebarAccountPanelProps) {
  return (
    <button type="button" className="sidebar-account-panel" aria-label={`Signed-in account: ${name}`}>
      <span className="sidebar-account-avatar" aria-hidden="true">{name.charAt(0)}</span>
      {!isCollapsed && (
        <span className="sidebar-account-meta">
          <span className="sidebar-account-name">{name}</span>
          {role ? <span className="sidebar-account-role">{role}</span> : null}
        </span>
      )}
      {!isCollapsed && <span className="sidebar-account-caret" aria-hidden="true">▾</span>}
    </button>
  );
}

const isNavItemActive = (activePath: string, item: NavItem) => {
  if (!item.href) {
    return false;
  }

  const paths = item.matchPaths ?? [item.href];
  return paths.some((path) => (path === '/' ? activePath === '/' : activePath.startsWith(path)));
};

export function AppShell({ children, currentPath }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [auditTrail, setAuditTrail] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

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
    <div className={`portal-shell ${isSidebarCollapsed ? 'portal-shell--collapsed' : ''}`}>
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-row">
            <div className="brand-mark" aria-hidden="true">☁</div>
            {!isSidebarCollapsed && <div className="brand">Nebula</div>}
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="sidebar-search" aria-hidden="true">
              <input type="text" value="" readOnly placeholder="Search" className="sidebar-search-input" />
              <span className="sidebar-search-hint">⌘K</span>
            </div>
          )}

          <nav className="nav-list" aria-label="Primary navigation">
            {primaryNavItems.map((item) => {
              if (item.isPlaceholder) {
                return (
                  <button type="button" className="nav-link nav-link--placeholder" key={item.label} disabled>
                    {isSidebarCollapsed ? item.label.charAt(0) : item.label}
                  </button>
                );
              }

              return (
                <Link
                  className={`nav-link ${isNavItemActive(activePath, item) ? 'active' : ''}`}
                  key={item.href}
                  href={item.href ?? '#'}
                  aria-label={item.label}
                  title={item.label}
                >
                  {isSidebarCollapsed ? item.label.charAt(0) : item.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-section-divider" />

          <nav className="nav-list nav-list--secondary" aria-label="Secondary navigation">
            {secondaryNavItems.map((item) => (
              <button type="button" className="nav-link nav-link--placeholder" key={item.label} disabled>
                {isSidebarCollapsed ? item.label.charAt(0) : item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <label className="dark-mode-row" htmlFor="dark-mode-toggle">
            {!isSidebarCollapsed && <span>Dark mode</span>}
            <button
              type="button"
              id="dark-mode-toggle"
              className={`switch ${isDarkMode ? 'is-on' : ''}`}
              aria-pressed={isDarkMode}
              onClick={() => setIsDarkMode((value) => !value)}
            >
              <span className="switch-thumb" />
            </button>
          </label>
          <SidebarAccountPanel name="Devin" role="Application Engineer" isCollapsed={isSidebarCollapsed} />
        </div>
      </aside>

      <div className="screen-shell">
        <main className="screen-content">{children}</main>
      </div>

      {isPaletteOpen && (
        <section className="palette-overlay" role="dialog" aria-label="Command palette">
          <div className="palette-panel">
            <div className="palette-input-row">
              <Badge variant="env">{activeApp?.name ?? 'My Applications'}</Badge>
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
