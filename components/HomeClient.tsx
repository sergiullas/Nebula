'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ApplicationCard } from '@/components/ApplicationCard';
import { EXECUTION_ACTION_LABELS, useActionExecution } from '@/components/execution';
import { mockApplications } from '@/components/data';

const getSuggestedImprovements = () => {
  const incidentApp = mockApplications.find((app) => app.activeIncident);
  const warningApp = mockApplications.find((app) => app.health === 'warning');
  const healthyApp = mockApplications.find((app) => app.health === 'healthy');

  return [
    incidentApp
      ? {
          id: 'rollback-incident',
          diagnosis: `${incidentApp.name} has an active incident with elevated risk.`,
          likelyCause: 'Current deployment state is unstable and requires immediate mitigation.',
          nextStep: `Run ${EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT} for ${incidentApp.name}.`,
          href: `/app/${incidentApp.id}`,
          action: EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT,
        }
      : null,
    warningApp
      ? {
          id: 'restart-degraded',
          diagnosis: `${warningApp.name} is degraded and trending below reliability target.`,
          likelyCause: 'Dependency health drift is reducing service stability.',
          nextStep: `Run ${EXECUTION_ACTION_LABELS.RESTART_SERVICE} on the most degraded dependency.`,
          href: `/app/${warningApp.id}`,
          action: EXECUTION_ACTION_LABELS.RESTART_SERVICE,
        }
      : null,
    healthyApp
      ? {
          id: 'template-baseline',
          diagnosis: `${healthyApp.name} is stable and ready for standardization.`,
          likelyCause: 'Template baseline has not been applied recently for architecture consistency.',
          nextStep: `Run ${EXECUTION_ACTION_LABELS.USE_TEMPLATE} to apply a governed baseline architecture.`,
          href: `/templates?appId=${healthyApp.id}&env=${healthyApp.environments.includes('prod') ? 'prod' : healthyApp.environments[0]}`,
          action: EXECUTION_ACTION_LABELS.USE_TEMPLATE,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    diagnosis: string;
    likelyCause: string;
    nextStep: string;
    href: string;
    action: string;
  }>;
};

export function HomeClient() {
  const { recentActions, templateCreatedServices } = useActionExecution();
  const recent = recentActions.slice(0, 6);
  const suggestions = getSuggestedImprovements().slice(0, 3);

  const systems = Object.entries(
    mockApplications.reduce<Record<string, string[]>>((acc, app) => {
      const key = `${app.organization} / ${app.project}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(app.name);
      return acc;
    }, {}),
  );

  const templateUsageCount = Object.values(templateCreatedServices).reduce((count, services) => count + services.length, 0);

  return (
    <AppShell currentPath="/">
      <div className="catalog-page">
        <header className="catalog-header">
          <div className="catalog-header-left">
            <h1 className="catalog-title">Home</h1>
            <p className="catalog-subtitle">Where should I focus? Start with applications, then act on guided recommendations.</p>
          </div>
        </header>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">My Applications</p>
            <p className="templates-section-hint">Health indicators and quick entry points</p>
          </div>
          <div className="cards-grid">
            {mockApplications.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Recent Activity</p>
            <p className="templates-section-hint">Includes template usage and execution outcomes</p>
          </div>
          {recent.length === 0 ? (
            <p className="placeholder muted">No recent actions yet. Run a template or execution action to populate this section.</p>
          ) : (
            <div className="dependency-list">
              {recent.map((entry) => (
                <article key={`${entry.timestamp}-${entry.actionType}-${entry.target}`} className="dependency-row">
                  <div className="dependency-main">
                    <p className="dependency-row__name">{entry.actionLabel} — {entry.application}</p>
                    <p className="dependency-row__detail">
                      Outcome: {entry.status === 'success' ? 'Success' : 'Failure'} · {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    {entry.message && <p className="dependency-row__detail">Result: {entry.message}</p>}
                  </div>
                  <div className="dependency-row__badges">
                    <span className={`pill ${entry.status === 'success' ? 'gov-approved' : 'gov-discouraged'}`}>{entry.status}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="detail-impact-note" style={{ marginTop: 8 }}>Template usage events tracked this session: {templateUsageCount}</p>
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Suggested Improvements (AI)</p>
            <p className="templates-section-hint">Diagnosis / Likely cause / Next step</p>
          </div>
          <div className="dependency-list">
            {suggestions.map((suggestion) => (
              <article key={suggestion.id} className="detail-why-block">
                <p className="detail-impact-note"><strong>Diagnosis:</strong> {suggestion.diagnosis}</p>
                <p className="detail-impact-note"><strong>Likely cause:</strong> {suggestion.likelyCause}</p>
                <p className="detail-impact-note"><strong>Next step:</strong> {suggestion.nextStep}</p>
                <Link href={suggestion.href} className="incident-button secondary" style={{ width: 'fit-content', textDecoration: 'none', marginTop: 8 }}>
                  Open {suggestion.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Systems</p>
            <p className="templates-section-hint">Read-only grouping (secondary)</p>
          </div>
          <div className="dependency-list">
            {systems.map(([systemName, apps]) => (
              <article key={systemName} className="dependency-row">
                <div className="dependency-main">
                  <p className="dependency-row__name">{systemName}</p>
                  <p className="dependency-row__detail">Applications: {apps.join(', ')}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
