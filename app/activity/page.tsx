'use client';

import { AppShell } from '@/components/AppShell';
import { useActionExecution } from '@/components/execution';

export default function ActivityPage() {
  const { recentActions } = useActionExecution();

  return (
    <AppShell currentPath="/activity">
      <div className="catalog-page">
        <header className="catalog-header">
          <div className="catalog-header-left">
            <h1 className="catalog-title">Recent Activity / Actions</h1>
            <p className="catalog-subtitle">System-wide action log for this runtime session (latest 20).</p>
          </div>
        </header>

        {recentActions.length === 0 ? (
          <p className="placeholder">No actions yet. Trigger an action from workspace, services, templates, or command palette.</p>
        ) : (
          <div className="dependency-list" role="log" aria-label="Recent actions">
            {recentActions.map((entry) => (
              <article key={`${entry.timestamp}-${entry.actionType}-${entry.source}`} className="dependency-row">
                <div className="dependency-main">
                  <p className="dependency-row__name">{entry.actionType}</p>
                  <p className="dependency-row__detail">
                    {entry.target ?? 'No target'} · {entry.source} · {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="dependency-row__badges">
                  <span className={`pill ${entry.status === 'success' ? 'gov-approved' : 'gov-discouraged'}`}>{entry.status}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
