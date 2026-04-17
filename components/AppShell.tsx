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
  icon: string;
  isPlaceholder?: boolean;
  matchPaths?: string[];
};

const coreWorkflowNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home', matchPaths: ['/', '/app'] },
  { href: '/catalog', label: 'Catalog', icon: 'inventory_2', matchPaths: ['/catalog'] },
  { label: 'Activity / Actions', icon: 'checklist', isPlaceholder: true },
  { label: 'Governance / Insights', icon: 'policy', isPlaceholder: true },
];

const supportingNavItems: NavItem[] = [
  { label: 'Docs', icon: 'description', isPlaceholder: true },
  { label: 'Explore', icon: 'travel_explore', isPlaceholder: true },
  { label: 'APIs', icon: 'api', isPlaceholder: true },
];

const systemNavItems: NavItem[] = [
  { label: 'Notifications', icon: 'notifications', isPlaceholder: true },
  { label: 'Settings', icon: 'settings', isPlaceholder: true },
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
            <button
              type="button"
              className="brand-mark-button"
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Nebula'}
            >
              <span className="brand-mark material-symbols-outlined" aria-hidden="true">cloud</span>
            </button>

            {!isSidebarCollapsed && (
              <div className="brand-group">
                <div className="brand">Nebula</div>
                <div className="brand-subtle">Cloud Brokerage Portal</div>
              </div>
            )}

            {!isSidebarCollapsed && (
              <button
                type="button"
                className="sidebar-collapse-toggle"
                onClick={() => setIsSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              </button>
            )}
          </div>

          <div className="nav-sections">
            <div>
              {!isSidebarCollapsed && <p className="nav-section-title">Core workflow</p>}
              <nav className="nav-list" aria-label="Core workflow navigation">
                {coreWorkflowNavItems.map((item) => {
                  if (item.isPlaceholder) {
                    return (
                      <button type="button" className="nav-link nav-link--placeholder" key={item.label} disabled>
                        <span className="material-symbols-outlined nav-link-icon" aria-hidden="true">{item.icon}</span>
                        {!isSidebarCollapsed && <span>{item.label}</span>}
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
                      <span className="material-symbols-outlined nav-link-icon" aria-hidden="true">{item.icon}</span>
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="nav-section-divider" />

            <div>
              {!isSidebarCollapsed && <p className="nav-section-title">Supporting tools</p>}
              <nav className="nav-list" aria-label="Supporting tools navigation">
                {supportingNavItems.map((item) => (
                  <button type="button" className="nav-link nav-link--placeholder" key={item.label} disabled>
                    <span className="material-symbols-outlined nav-link-icon" aria-hidden="true">{item.icon}</span>
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </nav>
            </div>

            {!isSidebarCollapsed && (
              <div className="provision-submenu" aria-hidden="true">
                <p className="provision-submenu-title">Provision</p>
                <p className="provision-submenu-item">Add service</p>
                <p className="provision-submenu-item">Use template</p>
              </div>
            )}

            <div className="nav-section-divider" />

            <div>
              {!isSidebarCollapsed && <p className="nav-section-title">System</p>}
              <nav className="nav-list" aria-label="System navigation">
                {systemNavItems.map((item) => (
                  <button type="button" className="nav-link nav-link--placeholder" key={item.label} disabled>
                    <span className="material-symbols-outlined nav-link-icon" aria-hidden="true">{item.icon}</span>
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {!isSidebarCollapsed && (
            <div className="sidebar-search" aria-hidden="true">
              <span className="material-symbols-outlined sidebar-search-icon" aria-hidden="true">search</span>
              <input type="text" value="" readOnly placeholder="Search" className="sidebar-search-input" />
              <span className="sidebar-search-hint">⌘K</span>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <label className="dark-mode-row" htmlFor="dark-mode-toggle">
            {!isSidebarCollapsed && (
              <span className="dark-mode-label">
                <span className="material-symbols-outlined" aria-hidden="true">dark_mode</span>
                <span>Dark mode</span>
              </span>
            )}
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
