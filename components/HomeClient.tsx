'use client';

import Link from 'next/link';
import { useMemo } from 'react';
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

type FocusBlockProps = {
  focusInsight?: SuggestedInsight;
  onExecuteRecommendedAction: (insight: SuggestedInsight) => void;
};

function FocusBlock({ focusInsight, onExecuteRecommendedAction }: FocusBlockProps) {
  const focusToneClassName = focusInsight
    ? focusInsight.priority === 1
      ? 'home-focus-block--critical'
      : focusInsight.priority === 2
        ? 'home-focus-block--warning'
        : 'home-focus-block--healthy'
    : '';

  return (
    <section className="templates-section home-section home-section--focus">
      <div className="templates-section-header">
        <p className="templates-section-label">Focus</p>
      </div>
      {focusInsight ? (
        <article className={`detail-why-block home-focus-block ${focusToneClassName}`}>
          <p className="home-focus-row">
            <span className="material-symbols-outlined home-focus-row__icon" aria-hidden>error</span>
            <span className="home-focus-row__label">Diagnosis:</span>
            <span className="home-focus-row__value">{focusInsight.diagnosis}</span>
          </p>
          <p className="home-focus-row">
            <span className="material-symbols-outlined home-focus-row__icon" aria-hidden>analytics</span>
            <span className="home-focus-row__label">Likely Cause:</span>
            <span className="home-focus-row__value">{focusInsight.likelyCause}</span>
          </p>
          <p className="home-focus-row">
            <span className="material-symbols-outlined home-focus-row__icon" aria-hidden>play_circle</span>
            <span className="home-focus-row__label">Recommended Action:</span>
            <span className="home-focus-row__value">{focusInsight.recommendedAction}</span>
          </p>
          <div className="home-focus-actions">
            <button type="button" className="incident-button home-focus-primary-cta" onClick={() => onExecuteRecommendedAction(focusInsight)}>
              {EXECUTION_ACTION_LABELS[focusInsight.actionType]}
            </button>
            <Link href={focusInsight.href} className="home-focus-link">
              View details
            </Link>
          </div>
        </article>
      ) : (
        <p className="placeholder muted home-focus-empty">No active recommendation at this time.</p>
      )}
    </section>
  );
}

function ApplicationsSection() {
  return (
    <section className="templates-section home-section home-section--applications">
      <div className="templates-section-header">
        <p className="templates-section-label">My Applications</p>
      </div>
      <div className="dependency-list home-application-list">
        {mockApplications.map((app) => {
          const statusLabel = app.health === 'warning' ? 'Degraded' : app.health === 'healthy' ? 'Healthy' : 'Critical';
          return (
            <article key={app.id} className="dependency-row home-application-row">
              <div className="dependency-main">
                <p className="dependency-row__name">{app.name}</p>
                <p className="dependency-row__detail">Status: {statusLabel}</p>
                <p className="dependency-row__detail">Key signal: {app.activeIncident ? 'Active incident' : app.aiSummary ?? 'No active signal'}</p>
              </div>
              <div className="dependency-row__badges home-application-row__meta">
                <span className={`pill ${app.health === 'healthy' ? 'gov-approved' : app.health === 'warning' ? 'gov-requires' : 'gov-discouraged'}`}>
                  {statusLabel}
                </span>
                <Link href={`/app/${app.id}`} className="home-inline-link">
                  Open
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type ActivitySectionProps = {
  recentActions: ReturnType<typeof useActionExecution>['recentActions'];
  toConciseActivityLabel: (actionLabel: string, target: string) => string;
};

function ActivitySection({ recentActions, toConciseActivityLabel }: ActivitySectionProps) {
  const recent = recentActions.slice(0, 5);

  return (
    <section className="templates-section home-section">
      <div className="templates-section-header">
        <p className="templates-section-label">Activity</p>
      </div>
      {recent.length === 0 ? (
        <p className="placeholder muted home-activity-empty">
          No recent actions. <Link href="/templates" className="home-inline-link">Use a template</Link>,{' '}
          <Link href={`/app/${mockApplications[0]?.id ?? ''}/catalog`} className="home-inline-link">add a service</Link>, or{' '}
          <Link href="/catalog" className="home-inline-link">open catalog</Link>.
        </p>
      ) : (
        <div className="dependency-list home-activity-list">
          {recent.map((entry) => (
            <article key={`${entry.timestamp}-${entry.actionType}-${entry.target}`} className="dependency-row home-activity-row">
              <div className="dependency-main">
                <p className="dependency-row__name">{toConciseActivityLabel(entry.actionLabel, entry.target)}</p>
                <p className="dependency-row__detail">{entry.status === 'success' ? 'Success' : 'Failure'} · {new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type SystemsSectionProps = {
  systems: Array<[string, string[]]>;
  additionalInsights: SuggestedInsight[];
};

function SystemsSection({ systems, additionalInsights }: SystemsSectionProps) {
  return (
    <section className="templates-section home-section home-section--systems">
      <div className="templates-section-header">
        <p className="templates-section-label">Systems / Supporting Context</p>
      </div>
      <div className="dependency-list">
        {systems.map(([systemName, apps]) => (
          <article key={systemName} className="dependency-row home-system-row">
            <div className="dependency-main">
              <p className="dependency-row__name">{systemName}</p>
              <p className="dependency-row__detail">Applications: {apps.join(', ')}</p>
            </div>
          </article>
        ))}
      </div>
      {additionalInsights.length > 0 && (
        <div className="home-supporting-insights">
          <p className="templates-section-hint">Additional AI context</p>
          <div className="dependency-list">
            {additionalInsights.map((insight) => (
              <article key={insight.id} className="detail-why-block home-supporting-insight-row">
                <p className="detail-impact-note"><strong>Diagnosis:</strong> {insight.diagnosis}</p>
                <p className="detail-impact-note"><strong>Likely Cause:</strong> {insight.likelyCause}</p>
                <p className="detail-impact-note"><strong>Recommended Action:</strong> {insight.recommendedAction}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function HomeClient() {
  const { recentActions, requestExecution } = useActionExecution();
  const suggestions = useMemo(() => getSuggestedImprovements(), []);
  const focusInsight = suggestions[0];
  const additionalInsights = suggestions.slice(1);

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
      <div className="catalog-page home-page-modern">
        <header className="catalog-header">
          <div className="catalog-header-left">
            <h1 className="catalog-title home-page-title">Home</h1>
            <p className="catalog-subtitle home-page-subtitle">Decision surface: identify one action first, then review system context.</p>
          </div>
        </header>

        <FocusBlock focusInsight={focusInsight} onExecuteRecommendedAction={executeRecommendedAction} />
        <ApplicationsSection />
        <ActivitySection recentActions={recentActions} toConciseActivityLabel={toConciseActivityLabel} />
        <SystemsSection systems={systems} additionalInsights={additionalInsights} />
      </div>
    </AppShell>
  );
}
