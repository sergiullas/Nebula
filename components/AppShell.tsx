'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { mockApplications } from './data';
import { buildSharedActions } from './actions';
import { Badge } from './Badge';
import { EXECUTION_ACTIONS, useActionExecution } from './execution';

type AppShellProps = {
  children: ReactNode;
  currentPath?: string;
};

type NavItem = {
  href?: string;
  label: string;
  icon: string;
  matchPaths?: string[];
};

const coreWorkflowNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home', matchPaths: ['/', '/app'] },
  { href: '/catalog', label: 'Catalog', icon: 'inventory_2', matchPaths: ['/catalog'] },
  { href: '/activity', label: 'Activity / Actions', icon: 'checklist', matchPaths: ['/activity'] },
];

type SidebarAccountPanelProps = {
  name: string;
  role?: string;
  isCollapsed: boolean;
};

function SidebarAccountPanel({ name, role, isCollapsed }: SidebarAccountPanelProps) {
  return (
    <div className="sidebar-account-panel" aria-label={`Signed-in account: ${name}`}>
      <span className="sidebar-account-avatar" aria-hidden="true">{name.charAt(0)}</span>
      {!isCollapsed && (
        <span className="sidebar-account-meta">
          <span className="sidebar-account-name">{name}</span>
          {role ? <span className="sidebar-account-role">{role}</span> : null}
        </span>
      )}
      {!isCollapsed && <span className="sidebar-account-caret" aria-hidden="true">▾</span>}
    </div>
  );
}

const isNavItemActive = (activePath: string, item: NavItem) => {
  if (!item.href) return false;
  const paths = item.matchPaths ?? [item.href];
  return paths.some((path) => (path === '/' ? activePath === '/' : activePath === path || activePath.startsWith(`${path}/`)));
};

export function AppShell({ children, currentPath }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { requestExecution, recentActions } = useActionExecution();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const activePath = pathname ?? currentPath ?? '/';
  const activeApp = useMemo(() => {
    const appPathMatch = activePath.match(/^\/app\/([^/]+)/);
    if (!appPathMatch) return undefined;
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
        if (action.category === 'navigation') {
          if (action.id === 'navigate-application' && !activeApp && mockApplications[0]) {
            router.push(`/app/${mockApplications[0].id}`);
          }
          if (action.id === 'open-ai-companion' && activeApp) {
            router.push(`/app/${activeApp.id}?openAi=true`);
          }
          if (action.id === 'jump-logs-metrics' && activeApp) {
            router.push(`/app/${activeApp.id}`);
          }
          setIsPaletteOpen(false);
          return;
        }

        const actionType = action.id === 'rollback'
          ? EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT
          : EXECUTION_ACTIONS.RESTART_SERVICE;

        requestExecution({
          payload: {
            actionType,
            target: activeApp?.name ?? 'No application selected',
            appId: activeApp?.id ?? 'unknown-app',
            applicationName: activeApp?.name,
            environment: currentEnvironment,
            provider: activeApp?.provider,
            impactSummary: action.id === 'rollback'
              ? 'Revert service to previous deployment version.'
              : 'Restart service workloads for the selected application.',
          },
        });
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

    if (!query) return ordered;
    const normalized = query.toLowerCase();
    return ordered.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [activeApp, currentEnvironment, query, requestExecution, router]);

  useEffect(() => setSelectedIndex(0), [query, isPaletteOpen]);
  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
      if (!isPaletteOpen) return;
      if (event.key === 'Escape') setIsPaletteOpen(false);
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
        item?.onSelect();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaletteOpen, paletteItems, selectedIndex]);

  return (
    <div className={`portal-shell ${isSidebarCollapsed ? 'portal-shell--collapsed' : ''}`}>
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-row">
            <button
              type="button"
              className="brand-mark-button"
              onClick={() => {
                if (isSidebarCollapsed) setIsSidebarCollapsed(false);
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
                  const isActive = isNavItemActive(activePath, item);
                  return (
                    <Link href={item.href ?? '#'} className={`nav-link ${isActive ? 'active' : ''}`} key={item.label} title={isSidebarCollapsed ? item.label : undefined}>
                      <span className="material-symbols-outlined nav-link-icon" aria-hidden="true">{item.icon}</span>
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {!isSidebarCollapsed && (
            <div className="sidebar-search sidebar-search--hidden" aria-hidden="true">
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
            <button type="button" id="dark-mode-toggle" className={`switch ${isDarkMode ? 'is-on' : ''}`} aria-pressed={isDarkMode} onClick={() => setIsDarkMode((value) => !value)} title={isSidebarCollapsed ? 'Dark mode' : undefined}>
              <span className="switch-thumb" />
            </button>
          </label>
          <div title={isSidebarCollapsed ? 'Profile' : undefined}>
            <SidebarAccountPanel name="Devin" role="Application Engineer" isCollapsed={isSidebarCollapsed} />
          </div>
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
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" className="palette-input" />
            </div>
            <div className="palette-results">
              {paletteItems.map((item, index) => (
                <button type="button" key={item.id} className={`palette-item ${index === selectedIndex ? 'selected' : ''}`} onClick={item.onSelect}>
                  <span className="palette-item-label">{item.label}</span>
                  <span className="palette-item-description">{item.description}</span>
                  {'requiresApplication' in item && item.requiresApplication && !activeApp && <span className="palette-item-hint">Select an application first</span>}
                </button>
              ))}
            </div>
            <footer className="palette-footer">↑↓ Navigate · Enter Select · Esc Close · ACME · Devin</footer>
            {recentActions.length > 0 && <p className="palette-audit">Last action: {recentActions[0].actionLabel} · {recentActions[0].status}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
