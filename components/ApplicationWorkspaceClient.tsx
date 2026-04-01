'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, BadgeVariant } from '@/components/Badge';
import { ActionStatus, AppLogsMetrics, CloudApplication, DependencyHealthStatus, HealthStatus } from '@/components/types';
import { ApplicationInsight, ApplicationInsights } from '@/components/ApplicationInsights';
import { useApplicationInsights } from '@/hooks/useApplicationInsights';

type ApplicationWorkspaceClientProps = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  currentEnvironment: string;
};

type WorkspaceTab = 'Overview' | 'Logs & metrics' | 'Deployments' | 'Services';

type InlineAction = {
  primary?: string;
  secondary?: string;
};

const INCIDENT_PROMPTS = ['What changed?', 'What is likely broken?', 'What should I do next?'] as const;
const tabs: WorkspaceTab[] = ['Overview', 'Logs & metrics', 'Deployments', 'Services'];

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getModalContent = (
  action: string,
  appName: string,
  environment: string,
  _deploymentVersion?: string,
) => {
  if (action === 'Roll back deployment') {
    return {
      title: 'Roll back deployment',
      summary: `This will revert ${appName} in ${environment} to the previous stable version.`,
      consequence: 'The current deployment will be replaced. This action is logged and attributable.',
      ctaLabel: 'Confirm rollback',
      isDestructive: true,
    };
  }

  if (action === 'Jump to logs & metrics') {
    return {
      title: 'Open logs & metrics',
      summary: `Navigate to the Logs & metrics tab for ${appName}.`,
      consequence: null,
      ctaLabel: 'Open',
      isDestructive: false,
    };
  }

  if (action === 'Open AI companion') {
    return {
      title: 'Open AI companion',
      summary: `Open the AI companion scoped to ${appName}.`,
      consequence: null,
      ctaLabel: 'Open',
      isDestructive: false,
    };
  }

  return {
    title: action,
    summary: `${action} will run for ${appName} in ${environment}.`,
    consequence: null,
    ctaLabel: 'Confirm',
    isDestructive: false,
  };
};

const dependencyClass: Record<DependencyHealthStatus, BadgeVariant> = {
  Healthy: 'healthy',
  Degraded: 'degraded',
  Critical: 'critical',
  Unknown: 'unknown',
};

const aiReply = (message: string, action?: InlineAction) => ({ message, action });

const createAiResponse = (
  query: string,
  application: CloudApplication,
  environment: string,
  health: HealthStatus,
  deploymentVersion: string,
  didRunRollback: boolean,
  unhealthyDependencies: string[],
) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === 'what changed?') {
    return didRunRollback
      ? aiReply(
          `${application.name} in ${environment} is now running ${deploymentVersion} after rollback. The prior release likely introduced unstable timeout behavior.`,
        )
      : aiReply(
          `${application.name} in ${environment} degraded after deployment ${deploymentVersion}. Timeout-related configuration drift is the strongest signal.`,
          { primary: 'Roll back deployment', secondary: 'Jump to logs & metrics' },
        );
  }

  if (normalizedQuery === 'what is likely broken?') {
    const dependencySignal = unhealthyDependencies.length
      ? `Unhealthy dependencies detected: ${unhealthyDependencies.join(', ')}.`
      : 'No unhealthy dependencies are currently reported.';

    return didRunRollback
      ? aiReply(`${application.name} in ${environment} is now ${health}. ${dependencySignal}`)
      : aiReply(
          `${application.name} in ${environment} is ${health} with elevated failures. ${dependencySignal} Both signals align with the v1.24 timeout configuration change.`,
          { primary: 'Roll back deployment', secondary: 'Review config' },
        );
  }

  if (normalizedQuery === 'what should i do next?') {
    return didRunRollback
      ? aiReply(`${application.name} shows positive post-rollback trend. Continue monitoring before incident closure.`)
      : aiReply(`${application.name} needs immediate mitigation in ${health}.`, {
          primary: 'Roll back deployment',
          secondary: 'Switch environment',
        });
  }

  return aiReply('I cannot answer that in this context. Try one of the suggested prompts.');
};

export function ApplicationWorkspaceClient({
  application,
  logsMetrics,
  currentEnvironment,
}: ApplicationWorkspaceClientProps) {
  const searchParams = useSearchParams();
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [aiResponse, setAiResponse] = useState(aiReply('Select a prompt or ask a supported question.'));
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [didRunRollback, setDidRunRollback] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Overview');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  const activeMetrics = useMemo(() => {
    if (!logsMetrics) {
      return undefined;
    }

    return didRunRollback && logsMetrics.rollbackSimulation
      ? logsMetrics.rollbackSimulation.postRollbackMetrics
      : logsMetrics.metrics;
  }, [didRunRollback, logsMetrics]);

  const dependencies = useMemo(() => logsMetrics?.dependencies ?? [], [logsMetrics]);

  const unhealthyDependencies = useMemo(
    () => dependencies.filter((dependency) => dependency.health === 'Critical' || dependency.health === 'Degraded'),
    [dependencies],
  );

  const activeHealth = useMemo<HealthStatus>(() => {
    if (didRunRollback && logsMetrics?.rollbackSimulation) {
      return logsMetrics.rollbackSimulation.postRollbackHealth;
    }

    return application.health;
  }, [application.health, didRunRollback, logsMetrics]);

  useEffect(() => {
    if (searchParams.get('openAi') === 'true') {
      setIsCompanionOpen(true);
    }
  }, [searchParams]);

  const submitQuery = (query: string) => {
    setAiResponse(
      createAiResponse(
        query,
        application,
        currentEnvironment,
        activeHealth,
        activeMetrics?.deploymentVersion ?? 'current deployment',
        didRunRollback,
        unhealthyDependencies.map((dependency) => dependency.name),
      ),
    );
  };

  const handleCompanionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuery(queryInput);
  };

  const executeAction = (label: string) => {
    setPendingAction(label);
  };

  const confirmAction = () => {
    if (!pendingAction) {
      return;
    }

    setAuditTrail((current) => [
      `${pendingAction} · ${application.name} · ${currentEnvironment} · Devin · ${new Date().toISOString()}`,
      ...current,
    ]);

    if (pendingAction === 'Roll back deployment' && logsMetrics?.rollbackSimulation && !didRunRollback) {
      setActionStatus('running');
      setActionFeedback('Simulating rollback...');
      window.setTimeout(() => {
        setDidRunRollback(true);
        setActionStatus('completed');
        setActionFeedback(logsMetrics.rollbackSimulation?.aiConfirmation ?? 'Rollback simulated successfully.');
      }, 1500);
    }

    if (pendingAction === 'Jump to logs & metrics') {
      setActiveTab('Logs & metrics');
    }

    if (pendingAction === 'Open AI companion') {
      setIsCompanionOpen(true);
    }

    setPendingAction(null);
  };


  const applicationInsights = useApplicationInsights({
    application,
    currentEnvironment,
    logsMetrics,
  });

  const handleInsightAction = (insight: ApplicationInsight) => {
    if (insight.actionType === 'suggest') {
      setActiveTab('Services');
      setActionFeedback('Opened Services so you can review affected dependencies.');
      return;
    }

    if (insight.actionType === 'modal') {
      setActionFeedback('Opened a recommendation flow. No infrastructure changes were made.');
      return;
    }

    setActionFeedback(`${insight.actionLabel} opened for ${insight.title}.`);
  };

  const providerVariant = application.provider === 'AWS' ? 'aws' : application.provider === 'GCP' ? 'gcp' : 'unknown';
  const healthVariant = activeHealth === 'healthy' ? 'healthy' : activeHealth === 'critical' ? 'critical' : 'degraded';

  return (
    <section className={`workspace-layout ${isCompanionOpen ? 'drawer-open' : 'drawer-closed'}`}>
      <div className="workspace-frame">
        <header className="workspace-head">
          <div>
            <p className="workspace-path">
              {application.organization} / {application.project}
            </p>
            <h1 className="workspace-title">{application.name}</h1>
            <div className="pill-row">
              <Badge variant={providerVariant}>{application.provider}</Badge>
              <Badge variant="env">{currentEnvironment}</Badge>
              <Badge variant={healthVariant}>{activeHealth === 'warning' ? 'Degraded' : toTitleCase(activeHealth)}</Badge>
            </div>
          </div>
        </header>

        {application.activeIncident ? (
          <section className="incident-banner">
            <div>
              <p className="incident-kicker">ACTIVE INCIDENT</p>
              <p className="incident-title">
                {toTitleCase(activeHealth)} in {currentEnvironment} · Error rate {activeMetrics?.errorRate ?? 'n/a'} ·{' '}
                {activeMetrics?.deploymentVersion ?? 'unknown deployment'}
              </p>
              <p className="incident-body">AI: Timeout config change is the most likely cause.</p>
            </div>
            <div className="incident-actions">
              <button
                type="button"
                className="incident-button"
                onClick={() => executeAction('Roll back deployment')}
                disabled={!logsMetrics?.rollbackSimulation || actionStatus === 'running' || didRunRollback}
              >
                {actionStatus === 'running' ? 'Rolling back...' : 'Roll back deployment'}
              </button>
              <button type="button" className="incident-button secondary">
                Review config
              </button>
            </div>
            {actionStatus === 'completed' && actionFeedback && (
              <p className="incident-feedback">{actionFeedback}</p>
            )}
          </section>
        ) : (
          <section className="status-banner">
            <span className="status-dot" /> All environments healthy · Last deployment {application.lastDeployment} · No active
            incidents
          </section>
        )}

        <nav className="workspace-tabs" aria-label="Workspace sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'Services' && unhealthyDependencies.length > 0 ? (
                <>
                  {tab}
                  <span className="tab__badge">{unhealthyDependencies.length}</span>
                </>
              ) : (
                tab
              )}
            </button>
          ))}
        </nav>

        {logsMetrics && activeMetrics && (
          <section className="metrics-grid">
            <article className="metric-card">
              <p className="metric-label">ERROR RATE</p>
              <p className={`metric-value ${activeHealth === 'critical' ? 'metric-critical' : ''}`}>{activeMetrics.errorRate}</p>
              <p className="metric-subtext">{activeHealth === 'critical' ? 'Critical' : 'Normal'}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">LATENCY P95</p>
              <p className={`metric-value ${activeHealth === 'critical' ? 'metric-critical' : ''}`}>{activeMetrics.latencyP95}</p>
              <p className="metric-subtext">{activeHealth === 'critical' ? 'Elevated' : 'Normal'}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">FAILED REQUESTS</p>
              <p className="metric-value">{activeMetrics.failedRequests}</p>
              <p className="metric-subtext">Last hour</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">DEPLOYMENT</p>
              <p className="metric-value">{activeMetrics.deploymentVersion}</p>
              <p className="metric-subtext">{application.lastDeployment}</p>
            </article>
          </section>
        )}

        {activeTab === 'Overview' && (
          <>
            <p className="overview-title">APPLICATION OVERVIEW</p>
            <ApplicationInsights insights={applicationInsights} onAction={handleInsightAction} />
            <section className="section-grid">
              <article className="section-card">
                <h2 className="section-title">Environments</h2>
                <p className="placeholder">{application.environments.join(' · ')}</p>
                <p className="placeholder">Provider-aware defaults active for {application.provider}</p>
              </article>

              <article className="section-card">
                <h2 className="section-title">Deployments</h2>
                <p className="placeholder muted">Deployment history coming soon</p>
              </article>

            </section>
          </>
        )}

        {activeTab === 'Logs & metrics' && (
          <section className="section-grid single-column">
            <article className="section-card">
              <h2 className="section-title">Recent Logs</h2>
              {logsMetrics?.logs.map((log) => (
                <p key={log} className="placeholder">
                  {log}
                </p>
              ))}
            </article>
          </section>
        )}

        {activeTab === 'Deployments' && (
          <section className="section-grid single-column">
            <article className="section-card">
              <h2 className="section-title">Deployment actions</h2>
              <p className="placeholder">Trigger deployment and rollback run through shared confirmation.</p>
            </article>
          </section>
        )}

        {activeTab === 'Services' && (
          <section className="services-block">
            <div className="services-header-row">
              <h2 className="section-title">Service dependencies</h2>
              <div className="toggle-row">
                <Link
                  href={`/app/${application.id}/catalog`}
                  className="incident-button add-service-cta"
                >
                  + Add service
                </Link>
              </div>
            </div>
            <div className="dependency-list">
                {dependencies.map((dependency) => (
                  <article key={dependency.name} className="dependency-row">
                    <span className={`dependency-row__dot dependency-row__dot--${dependencyClass[dependency.health]}`} />
                    <div className="dependency-main">
                      <p className="dependency-row__name">{dependency.name}</p>
                      <p className="dependency-row__detail">{dependency.metadata}</p>
                    </div>
                    <div className="dependency-row__badges">
                      <Badge variant={dependency.provider === 'AWS' ? 'aws' : dependency.provider === 'GCP' ? 'gcp' : 'unknown'}>
                        {dependency.provider}
                      </Badge>
                      <Badge variant={dependencyClass[dependency.health]}>{dependency.health}</Badge>
                    </div>
                  </article>
                ))}
              </div>
          </section>
        )}

        {actionFeedback && actionStatus === 'completed' && pendingAction !== 'Roll back deployment' && (
          <p className="action-feedback">{actionFeedback}</p>
        )}
        {auditTrail.length > 0 && <p className="action-feedback">Audit: {auditTrail[0]}</p>}
      </div>

      <aside className={`ai-drawer ${isCompanionOpen ? 'open' : 'closed'}`} aria-label="AI companion drawer">
        <button
          type="button"
          className="ask-ai-tab"
          onClick={() => setIsCompanionOpen((current) => !current)}
          aria-expanded={isCompanionOpen}
          aria-controls="ai-drawer-content"
        >
          Ask AI
        </button>

        <div id="ai-drawer-content" className="ai-drawer-content">
          <div className="ai-drawer-head">
            <div>
              <h3 className="ai-drawer-title">AI companion</h3>
              <p className="ai-context-line">Scoped to {application.name}</p>
            </div>
            <button type="button" className="ai-close-button" onClick={() => setIsCompanionOpen(false)} aria-label="Close AI companion">
              ✕
            </button>
          </div>

          <div className="ai-prompt-list" aria-label="Suggested prompts">
            {INCIDENT_PROMPTS.map((query) => (
              <button key={query} type="button" className="ai-prompt-button" onClick={() => submitQuery(query)}>
                {query}
              </button>
            ))}
          </div>

          <div className="ai-response-area" aria-live="polite">
            <p>{aiResponse.message}</p>
            {aiResponse.action?.primary && (
              <div className="ai-action-row">
                <button type="button" className="incident-button" onClick={() => executeAction(aiResponse.action?.primary ?? '')}>
                  {aiResponse.action.primary}
                </button>
                {aiResponse.action.secondary && (
                  <button type="button" className="incident-button secondary">
                    {aiResponse.action.secondary}
                  </button>
                )}
              </div>
            )}
          </div>

          <form className="ai-input-row" onSubmit={handleCompanionSubmit}>
            <input
              type="text"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Use a suggested prompt"
              className="ai-input"
            />
            <button type="submit" className="ai-submit-button">
              Ask
            </button>
          </form>
        </div>
      </aside>

      {pendingAction && (() => {
        const modal = getModalContent(
          pendingAction,
          application.name,
          currentEnvironment,
          activeMetrics?.deploymentVersion,
        );
        return (
          <section className="confirm-overlay" role="dialog" aria-modal="true" aria-label={modal.title}>
            <div className={`confirm-modal ${modal.isDestructive ? 'confirm-modal--destructive' : ''}`}>
              <h2 className="confirm-modal__title">{modal.title}</h2>
              <p className="confirm-modal__summary">{modal.summary}</p>
              {modal.consequence && (
                <p className="confirm-modal__consequence">{modal.consequence}</p>
              )}
              <div className="confirm-modal__meta">
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Application</span>
                  <span className="confirm-modal__meta-value">{application.name}</span>
                </div>
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Environment</span>
                  <span className="confirm-modal__meta-value">{currentEnvironment}</span>
                </div>
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Confirmed by</span>
                  <span className="confirm-modal__meta-value">Devin</span>
                </div>
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className={modal.isDestructive ? 'incident-button' : 'incident-button secondary'}
                  onClick={confirmAction}
                >
                  {modal.ctaLabel}
                </button>
                <button
                  type="button"
                  className="incident-button secondary"
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        );
      })()}
    </section>
  );
}
