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
            <p className="catalog-subtitle">Execution order is newest first. Session memory only (max 20).</p>
          </div>
        </header>

        {recentActions.length === 0 ? (
          <p className="placeholder">No execution actions yet. Run rollback, provision service, use template, or restart service.</p>
        ) : (
          <div className="dependency-list" role="log" aria-label="Recent actions">
            {recentActions.map((entry) => {
              const context = [entry.provider, entry.environment].filter(Boolean).join(' / ');
              const actionHeadline = entry.actionType === 'USE_TEMPLATE'
                ? `Applied template: ${entry.target}`
                : entry.actionLabel;
              return (
                <article key={`${entry.timestamp}-${entry.actionType}-${entry.target}`} className="dependency-row">
                  <div className="dependency-main">
                    <p className="dependency-row__name">
                      {actionHeadline} — {entry.application}{context ? ` (${context})` : ''} — {entry.status === 'success' ? 'Success' : 'Failure'}
                    </p>
                    <p className="dependency-row__detail">
                      Target: {entry.target} · {new Date(entry.timestamp).toLocaleString()}
                      {entry.governanceState ? ` · Governance: ${entry.governanceState}` : ''}
                    </p>
                    {entry.message && <p className="dependency-row__detail">Result: {entry.message}</p>}
                    {entry.details && <p className="dependency-row__detail">Details: {entry.details}</p>}
                  </div>
                  <div className="dependency-row__badges">
                    <span className={`pill ${entry.status === 'success' ? 'gov-approved' : 'gov-discouraged'}`}>{entry.status}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
