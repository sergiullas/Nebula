'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EXECUTION_ACTION_LABELS, EXECUTION_ACTIONS, ExecutionActionType, useActionExecution } from '@/components/execution';
import { mockApplications } from '@/components/data';

type InsightPriority = 1 | 2 | 3;

type SuggestedInsight = {
  id: string;
  priority: InsightPriority;
  diagnosis: string;
  likelyCause: string;
  recommendedAction: string;
  target: string;
  appId: string;
  applicationName: string;
  provider: string;
  environment: string;
  actionType: ExecutionActionType;
  href: string;
};

const getSuggestedImprovements = (): SuggestedInsight[] => {
  const incidentApp = mockApplications.find((app) => app.activeIncident);
  const warningApp = mockApplications.find((app) => app.health === 'warning');
  const healthyApp = mockApplications.find((app) => app.health === 'healthy');

  const candidateInsights: Array<SuggestedInsight | null> = [
    incidentApp
      ? {
          id: 'rollback-incident',
          priority: 1 as const,
          diagnosis: `${incidentApp.name} has an active incident with elevated risk.`,
          likelyCause: 'Current deployment state is unstable and requires immediate mitigation.',
          recommendedAction: `Run ${EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT} for ${incidentApp.name}.`,
          target: incidentApp.name,
          appId: incidentApp.id,
          applicationName: incidentApp.name,
          provider: incidentApp.provider,
          environment: incidentApp.environments.includes('prod') ? 'prod' : incidentApp.environments[0],
          actionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
          href: `/app/${incidentApp.id}`,
        }
      : null,
    warningApp
      ? {
          id: 'restart-degraded',
          priority: 2 as const,
          diagnosis: `${warningApp.name} is degraded and trending below reliability target.`,
          likelyCause: 'Dependency health drift is reducing service stability.',
          recommendedAction: `Run ${EXECUTION_ACTION_LABELS.RESTART_SERVICE} on the most degraded dependency.`,
          target: `${warningApp.name} primary dependency`,
          appId: warningApp.id,
          applicationName: warningApp.name,
          provider: warningApp.provider,
          environment: warningApp.environments.includes('prod') ? 'prod' : warningApp.environments[0],
          actionType: EXECUTION_ACTIONS.RESTART_SERVICE,
          href: `/app/${warningApp.id}`,
        }
      : null,
    healthyApp
      ? {
          id: 'template-baseline',
          priority: 3 as const,
          diagnosis: `${healthyApp.name} is stable and ready for standardization.`,
          likelyCause: 'Template baseline has not been applied recently for architecture consistency.',
          recommendedAction: `Run ${EXECUTION_ACTION_LABELS.USE_TEMPLATE} to apply a governed baseline architecture.`,
          target: `${healthyApp.provider} baseline template`,
          appId: healthyApp.id,
          applicationName: healthyApp.name,
          provider: healthyApp.provider,
          environment: healthyApp.environments.includes('prod') ? 'prod' : healthyApp.environments[0],
          actionType: EXECUTION_ACTIONS.USE_TEMPLATE,
          href: `/templates?appId=${healthyApp.id}&env=${healthyApp.environments.includes('prod') ? 'prod' : healthyApp.environments[0]}`,
        }
      : null,
  ];

  return candidateInsights
    .filter((insight): insight is SuggestedInsight => insight !== null)
    .sort((a, b) => a.priority - b.priority);
};

export function HomeClient() {
  const { recentActions, requestExecution } = useActionExecution();
  const [showAdditionalInsights, setShowAdditionalInsights] = useState(false);
  const suggestions = useMemo(() => getSuggestedImprovements(), []);
  const focusInsight = suggestions[0];
  const additionalInsights = suggestions.slice(1);
  const recent = recentActions.slice(0, 5);

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

  const executeRecommendedAction = (insight: SuggestedInsight) => {
    requestExecution({
      payload: {
        actionType: insight.actionType,
        target: insight.target,
        appId: insight.appId,
        applicationName: insight.applicationName,
        provider: insight.provider,
        environment: insight.environment,
        impactSummary: insight.recommendedAction,
      },
    });
  };

  const toConciseActivityLabel = (actionLabel: string, target: string) => {
    if (actionLabel === EXECUTION_ACTION_LABELS.USE_TEMPLATE) {
      return `Applied template: ${target}`;
    }
    if (actionLabel === EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT) {
      return `Rollback: ${target}`;
    }
    if (actionLabel === EXECUTION_ACTION_LABELS.RESTART_SERVICE) {
      return `Restart service: ${target}`;
    }
    return `${actionLabel}: ${target}`;
  };

  return (
    <AppShell currentPath="/">
      <div className="catalog-page">
        <header className="catalog-header">
          <div className="catalog-header-left">
            <h1 className="catalog-title">Home</h1>
            <p className="catalog-subtitle">Decision surface: identify one action first, then review system context.</p>
          </div>
        </header>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Focus</p>
            <p className="templates-section-hint">What should I do now?</p>
          </div>
          {focusInsight ? (
            <article className="detail-why-block home-focus-block">
              <p className="detail-impact-note"><strong>Diagnosis:</strong> {focusInsight.diagnosis}</p>
              <p className="detail-impact-note"><strong>Likely Cause:</strong> {focusInsight.likelyCause}</p>
              <p className="detail-impact-note"><strong>Recommended Action:</strong> {focusInsight.recommendedAction}</p>
              <div className="toggle-row" style={{ marginTop: 8 }}>
                <button type="button" className="incident-button" onClick={() => executeRecommendedAction(focusInsight)}>
                  {EXECUTION_ACTION_LABELS[focusInsight.actionType]}
                </button>
                <Link href={focusInsight.href} className="incident-button secondary" style={{ textDecoration: 'none' }}>
                  Review context
                </Link>
              </div>
            </article>
          ) : (
            <p className="placeholder muted">No active recommendation at this time.</p>
          )}
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">My Applications</p>
            <p className="templates-section-hint">What exists?</p>
          </div>
          <div className="dependency-list">
            {mockApplications.map((app) => (
              <article key={app.id} className="dependency-row">
                <div className="dependency-main">
                  <p className="dependency-row__name">{app.name}</p>
                  <p className="dependency-row__detail">Status: {app.health === 'warning' ? 'Degraded' : app.health === 'healthy' ? 'Healthy' : 'Critical'} · Last deployment: {app.lastDeployment}</p>
                  <p className="dependency-row__detail">Key signal: {app.activeIncident ? 'Active incident' : app.aiSummary ?? 'No active signal'}</p>
                </div>
                <div className="dependency-row__badges">
                  <span className={`pill ${app.health === 'healthy' ? 'gov-approved' : app.health === 'warning' ? 'gov-requires' : 'gov-discouraged'}`}>
                    {app.health}
                  </span>
                  <Link href={`/app/${app.id}`} className="incident-button secondary" style={{ textDecoration: 'none' }}>
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Activity</p>
            <p className="templates-section-hint">What happened?</p>
          </div>
          {recent.length === 0 ? (
            <p className="placeholder muted">No recent actions yet.</p>
          ) : (
            <div className="dependency-list">
              {recent.map((entry) => (
                <article key={`${entry.timestamp}-${entry.actionType}-${entry.target}`} className="dependency-row">
                  <div className="dependency-main">
                    <p className="dependency-row__name">{toConciseActivityLabel(entry.actionLabel, entry.target)}</p>
                    <p className="dependency-row__detail">{entry.status === 'success' ? 'Success' : 'Failure'} · {new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Additional AI Insights</p>
            <button type="button" className="templates-show-more" onClick={() => setShowAdditionalInsights((value) => !value)}>
              {additionalInsights.length} additional insights {showAdditionalInsights ? '▾' : '▸'}
            </button>
          </div>
          {showAdditionalInsights && additionalInsights.length > 0 && (
            <div className="dependency-list">
              {additionalInsights.map((insight) => (
                <article key={insight.id} className="detail-why-block">
                  <p className="detail-impact-note"><strong>Diagnosis:</strong> {insight.diagnosis}</p>
                  <p className="detail-impact-note"><strong>Likely Cause:</strong> {insight.likelyCause}</p>
                  <p className="detail-impact-note"><strong>Recommended Action:</strong> {insight.recommendedAction}</p>
                </article>
              ))}
            </div>
          )}
          {additionalInsights.length === 0 && <p className="placeholder muted">No additional insights.</p>}
        </section>

        <section className="templates-section">
          <div className="templates-section-header">
            <p className="templates-section-label">Systems</p>
            <p className="templates-section-hint">Read-only grouping (tertiary)</p>
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
