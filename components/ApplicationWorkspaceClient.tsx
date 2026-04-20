'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EXECUTION_ACTIONS, useActionExecution } from '@/components/execution';
import { Badge, BadgeVariant } from '@/components/Badge';
import { AppLogsMetrics, CloudApplication, DependencyHealthStatus, HealthStatus } from '@/components/types';
import { ApplicationInsight, ApplicationInsights } from '@/components/ApplicationInsights';
import { useApplicationInsights } from '@/hooks/useApplicationInsights';

type ApplicationWorkspaceClientProps = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  currentEnvironment: string;
};

type WorkspaceTab = 'Overview' | 'Logs & metrics' | 'Deployments' | 'Services';

type InlineAction = {
  label: string;
  executionActionType: (typeof EXECUTION_ACTIONS)[keyof typeof EXECUTION_ACTIONS];
  target: string;
  impactSummary: string;
  details?: string;
};

const tabs: WorkspaceTab[] = ['Overview', 'Logs & metrics', 'Deployments', 'Services'];

const getContextualPrompts = (
  isIncident: boolean,
  didRunRollback: boolean,
): string[] => {
  if (didRunRollback) {
    return [
      'Is the rollback working?',
      'What should I monitor now?',
      'When can I close this incident?',
    ];
  }

  if (isIncident) {
    return [
      'What changed?',
      'What is likely broken?',
      'What should I do next?',
    ];
  }

  return [
    'How is this app performing?',
    'Any optimization opportunities?',
    'What changed in the last deployment?',
  ];
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const dependencyClass: Record<DependencyHealthStatus, BadgeVariant> = {
  Healthy: 'healthy',
  Degraded: 'degraded',
  Critical: 'critical',
  Unknown: 'unknown',
};

type CompanionResponse = {
  diagnosis: string;
  likelyCause: string;
  recommendedAction: string;
  recommendedActionReasoning: string;
  action: InlineAction;
};

const aiReply = (
  diagnosis: string,
  likelyCause: string,
  recommendedActionReasoning: string,
  action: InlineAction,
): CompanionResponse => ({
  diagnosis,
  likelyCause,
  recommendedAction: action.label,
  recommendedActionReasoning,
  action,
});

const createAiResponse = (
  query: string,
  application: CloudApplication,
  environment: string,
  health: HealthStatus,
  deploymentVersion: string,
  didRunRollback: boolean,
  unhealthyDependencies: string[],
  templateServiceCount: number,
  lastActionLabel?: string,
) => {
  const normalizedQuery = query.trim().toLowerCase();
  const unhealthySummary = unhealthyDependencies.length > 0
    ? `Services currently degraded: ${unhealthyDependencies.join(', ')}.`
    : 'No degraded services are currently reported.';
  const templateSummary = templateServiceCount > 0
    ? `${templateServiceCount} template-created services are already attached to this application.`
    : 'No template-created services are attached to this application.';
  const recentActionSummary = lastActionLabel
    ? `Most recent executed action: ${lastActionLabel}.`
    : 'No recent execution action is logged in this session.';

  if (normalizedQuery === 'what changed?') {
    return didRunRollback
      ? aiReply(
          `${application.name} is running ${deploymentVersion} in ${environment} after rollback.`,
          `Recent deployment history indicates timeout behavior drift in the prior release. ${recentActionSummary}`,
          'Continue monitoring recovery. If errors rise again, execute a targeted service restart.',
          {
            label: 'Restart degraded service',
            executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
            target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
            impactSummary: 'Restart the most affected dependency to stabilize request flow.',
          },
        )
      : aiReply(
          `${application.name} degraded after deployment ${deploymentVersion} in ${environment}.`,
          `Health state is ${health} with elevated failures after deployment. Timeout configuration drift is the dominant signal. ${unhealthySummary}`,
          'Rollback the deployment through the execution dispatcher to restore the previous stable version.',
          {
            label: 'Rollback deployment',
            executionActionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
            target: application.name,
            impactSummary: 'Revert service to previous deployment version.',
          },
        );
  }

  if (normalizedQuery === 'what is likely broken?') {
    return didRunRollback
      ? aiReply(
          `${application.name} is ${health} in ${environment} after rollback.`,
          `${unhealthySummary} ${recentActionSummary}`,
          'Restart one degraded dependency through execution to complete recovery.',
          {
            label: 'Restart degraded service',
            executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
            target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
            impactSummary: 'Restart the most affected dependency to stabilize request flow.',
          },
        )
      : aiReply(
          `${application.name} is ${health} with elevated failures in ${environment}.`,
          `${unhealthySummary} Both service health and deployment timing align with the latest timeout configuration change.`,
          'Execute rollback now to remove the failing configuration set from production traffic.',
          {
            label: 'Rollback deployment',
            executionActionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
            target: application.name,
            impactSummary: 'Revert service to previous deployment version.',
          },
        );
  }

  if (normalizedQuery === 'what should i do next?') {
    return didRunRollback
      ? aiReply(
          `${application.name} is trending toward recovery after rollback.`,
          `${unhealthySummary} ${recentActionSummary}`,
          'Execute a targeted restart for the most degraded service to finalize stabilization.',
          {
            label: 'Restart degraded service',
            executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
            target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
            impactSummary: 'Restart the most affected dependency to stabilize request flow.',
          },
        )
      : aiReply(
          `${application.name} requires immediate mitigation while health is ${health}.`,
          `Active incident plus elevated failures indicates current deployment is unstable in ${environment}.`,
          'Execute rollback deployment through confirmation flow.',
          {
            label: 'Rollback deployment',
            executionActionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
            target: application.name,
            impactSummary: 'Revert service to previous deployment version.',
          },
        );
  }

  if (normalizedQuery === 'how is this app performing?') {
    return aiReply(
      `${application.name} is healthy in ${environment} and within normal reliability thresholds.`,
      `${unhealthySummary} ${templateSummary}`,
      'Execute a template rollout to enforce a standardized baseline before future scale changes.',
      {
        label: 'Apply baseline template',
        executionActionType: EXECUTION_ACTIONS.USE_TEMPLATE,
        target: `${application.provider} baseline template`,
        impactSummary: 'Apply a standardized template baseline for operational consistency.',
      },
    );
  }

  if (normalizedQuery === 'any optimization opportunities?') {
    return aiReply(
      `${application.name} has no critical reliability gap, but optimization opportunity exists.`,
      `Current state is stable and supports low-risk baseline optimization. ${templateSummary}`,
      'Apply a governed template baseline through execution to align future service growth.',
      {
        label: 'Apply baseline template',
        executionActionType: EXECUTION_ACTIONS.USE_TEMPLATE,
        target: `${application.provider} baseline template`,
        impactSummary: 'Apply a standardized template baseline for operational consistency.',
      },
    );
  }

  if (normalizedQuery === 'what changed in the last deployment?') {
    return aiReply(
      `Latest deployment version is ${deploymentVersion} for ${application.name}.`,
      `${recentActionSummary} ${unhealthySummary}`,
      'Run a restart action for the most affected service if elevated failures persist.',
      {
        label: 'Restart degraded service',
        executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
        target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
        impactSummary: 'Restart the most affected dependency to stabilize request flow.',
      },
    );
  }

  if (normalizedQuery === 'is the rollback working?') {
    return aiReply(
      `${application.name} is recovering after rollback.`,
      `Error trend is improving, but dependency health still requires verification. ${unhealthySummary}`,
      'Execute a targeted service restart if any dependency remains degraded after rollback.',
      {
        label: 'Restart degraded service',
        executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
        target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
        impactSummary: 'Restart the most affected dependency to stabilize request flow.',
      },
    );
  }

  if (normalizedQuery === 'what should i monitor now?') {
    return aiReply(
      `Primary indicators are error rate and latency P95 for ${application.name}.`,
      `These indicators must continue to improve after rollback and any restart action. ${recentActionSummary}`,
      'Restart the most degraded service if those indicators stall.',
      {
        label: 'Restart degraded service',
        executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
        target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
        impactSummary: 'Restart the most affected dependency to stabilize request flow.',
      },
    );
  }

  if (normalizedQuery === 'when can i close this incident?') {
    return aiReply(
      'Incident closure criteria are measurable and not yet automatic.',
      'Closure requires sustained recovery with stable dependency health and no active execution backlog.',
      'Restart any remaining degraded dependency before incident closure validation.',
      {
        label: 'Restart degraded service',
        executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
        target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
        impactSummary: 'Restart the most affected dependency to stabilize request flow.',
      },
    );
  }

  return aiReply(
    `${application.name} requires a context-grounded decision response.`,
    `${unhealthySummary} ${templateSummary} ${recentActionSummary}`,
    'Execute the highest-impact available action: rollback if incident is active, otherwise restart the most degraded service.',
    application.activeIncident && !didRunRollback
      ? {
          label: 'Rollback deployment',
          executionActionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
          target: application.name,
          impactSummary: 'Revert service to previous deployment version.',
        }
      : {
          label: 'Restart degraded service',
          executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
          target: unhealthyDependencies[0] ?? `${application.name} primary dependency`,
          impactSummary: 'Restart the most affected dependency to stabilize request flow.',
        },
  );
};

export function ApplicationWorkspaceClient({
  application,
  logsMetrics,
  currentEnvironment,
}: ApplicationWorkspaceClientProps) {
  const searchParams = useSearchParams();
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [aiResponse, setAiResponse] = useState(
    aiReply(
      application.activeIncident
        ? `${application.name} has an active incident and requires immediate mitigation.`
        : `AI companion is ready for a system decision request for ${application.name}.`,
      application.activeIncident
        ? 'Incident context indicates elevated operational risk.'
        : 'Initial state requires baseline standardization before the next change window.',
      application.activeIncident
        ? 'Rollback is the fastest governed path to restore known-good behavior.'
        : 'Applying a governed baseline template establishes a deterministic operating posture.',
      application.activeIncident
        ? {
            label: 'Rollback deployment',
            executionActionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
            target: application.name,
            impactSummary: 'Revert service to previous deployment version.',
          }
        : {
            label: 'Apply baseline template',
            executionActionType: EXECUTION_ACTIONS.USE_TEMPLATE,
            target: `${application.provider} baseline template`,
            impactSummary: 'Apply a standardized template baseline for operational consistency.',
          },
    ),
  );
  const [didRunRollback, setDidRunRollback] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Overview');
  const { requestExecution, templateCreatedServices, recentActions } = useActionExecution();

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

  const appTemplateServices = useMemo(
    () => templateCreatedServices[application.id] ?? [],
    [application.id, templateCreatedServices],
  );

  const activeHealth = useMemo<HealthStatus>(() => {
    if (didRunRollback && logsMetrics?.rollbackSimulation) {
      return logsMetrics.rollbackSimulation.postRollbackHealth;
    }

    return application.health;
  }, [application.health, didRunRollback, logsMetrics]);

  const contextualPrompts = getContextualPrompts(
    application.activeIncident,
    didRunRollback,
  );

  useEffect(() => {
    if (searchParams.get('openAi') === 'true') {
      setIsCompanionOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (didRunRollback) {
      setAiResponse(
        aiReply(
          'Rollback execution is active for this application.',
          'Recent action state indicates rollback has started and dependency health must be verified.',
          'Use a recovery prompt and execute a targeted restart if degraded dependencies remain.',
          {
            label: 'Restart degraded service',
            executionActionType: EXECUTION_ACTIONS.RESTART_SERVICE,
            target: unhealthyDependencies[0]?.name ?? `${application.name} primary dependency`,
            impactSummary: 'Restart the most affected dependency to stabilize request flow.',
          },
        ),
      );
    }
  }, [application.name, didRunRollback, unhealthyDependencies]);

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
        appTemplateServices.length,
        recentActions[0]?.actionLabel,
      ),
    );
  };

  const handleCompanionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuery(queryInput);
  };

  const executeAction = (label: string) => {
    if (label === 'Rollback deployment') {
      requestExecution({
        payload: {
          actionType: EXECUTION_ACTIONS.ROLLBACK_DEPLOYMENT,
          target: application.name,
          appId: application.id,
          applicationName: application.name,
          provider: application.provider,
          environment: currentEnvironment,
          impactSummary: 'Revert service to previous deployment version.',
        },
        onComplete: (result) => {
          if (result.status === 'success' && logsMetrics?.rollbackSimulation && !didRunRollback) {
            setDidRunRollback(true);
            setActionFeedback(logsMetrics.rollbackSimulation.aiConfirmation ?? result.message);
            return;
          }

          setActionFeedback(result.message);
        },
      });
      return;
    }

    if (label === 'Jump to logs & metrics') {
      setActiveTab('Logs & metrics');
      setActionFeedback(`Opened logs & metrics for ${application.name}.`);
      return;
    }

    if (label === 'Open AI companion') {
      setIsCompanionOpen(true);
      setActionFeedback(`AI companion opened for ${application.name}.`);
      return;
    }

    setActionFeedback(`${label} completed for ${application.name}.`);
  };

  const executeRecommendedAction = (action: InlineAction) => {
    requestExecution({
      payload: {
        actionType: action.executionActionType,
        target: action.target,
        appId: application.id,
        applicationName: application.name,
        provider: application.provider,
        environment: currentEnvironment,
        governanceState: 'approved',
        impactSummary: action.impactSummary,
        templateName: action.executionActionType === EXECUTION_ACTIONS.USE_TEMPLATE ? action.target : undefined,
      },
      onComplete: (result) => {
        setActionFeedback(result.message);
      },
    });
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
                onClick={() => executeAction('Rollback deployment')}
                disabled={!logsMetrics?.rollbackSimulation || didRunRollback}
              >
Rollback deployment
              </button>
              <button type="button" className="incident-button secondary">
                Review config
              </button>
            </div>
            {actionFeedback && (
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
          <section className="logs-section">
            <div className="logs-header">
              <h2 className="section-title">Recent logs</h2>
              <span className="logs-count">{logsMetrics?.logs.length ?? 0} entries</span>
            </div>
            <div className="log-list" role="log" aria-label="Application logs" aria-live="polite">
              {logsMetrics?.logs.map((entry, index) => (
                <div key={index} className={`log-entry log-entry--${entry.level.toLowerCase()}`}>
                  <span className="log-level">{entry.level}</span>
                  <span className="log-timestamp">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="log-source">{entry.source}</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))}
            </div>
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
                  href={`/templates?appId=${application.id}&env=${currentEnvironment}`}
                  className="incident-button"
                >
                  Start with template
                </Link>
                <Link
                  href={`/app/${application.id}/catalog?env=${currentEnvironment}`}
                  className="incident-button secondary add-service-cta"
                >
                  Add service individually
                </Link>
              </div>
            </div>
            <p className="placeholder muted">
              Templates are the recommended default path for {application.name}. Context is preserved for provider {application.provider} and environment {currentEnvironment}.
            </p>

            {appTemplateServices.length > 0 && (
              <section className="detail-why-block" style={{ marginBottom: 14 }}>
                <p className="detail-why-block-label">TEMPLATE-CREATED SERVICES</p>
                <p className="detail-impact-note">Lineage: template → created services → {application.name}</p>
                {appTemplateServices.map((service) => (
                  <p key={service.id} className="detail-impact-note">
                    {service.serviceName} · Created from template: {service.templateName} · {service.status === 'applied' ? 'Applied' : 'Pending approval'}
                  </p>
                ))}
              </section>
            )}

            <div className="dependency-list">
              {dependencies.map((dependency) => (
                <article key={dependency.name} className="dependency-row">
                  <span className={`dependency-row__dot dependency-row__dot--${dependencyClass[dependency.health]}`} />
                  <div className="dependency-main">
                    <p className="dependency-row__name">{dependency.name}</p>
                    <p className="dependency-row__detail">{dependency.metadata}</p>
                    <p className="dependency-row__detail">Added individually</p>
                  </div>
                  <div className="dependency-row__badges">
                    <Badge variant={dependency.provider === 'AWS' ? 'aws' : dependency.provider === 'GCP' ? 'gcp' : 'unknown'}>
                      {dependency.provider}
                    </Badge>
                    <Badge variant={dependencyClass[dependency.health]}>{dependency.health}</Badge>
                  </div>
                </article>
              ))}

              {appTemplateServices.map((service) => (
                <article key={service.id} className="dependency-row">
                  <span className="dependency-row__dot dependency-row__dot--healthy" />
                  <div className="dependency-main">
                    <p className="dependency-row__name">{service.serviceName}</p>
                    <p className="dependency-row__detail">
                      Created from template: {service.templateName} · Application: {service.applicationName}
                    </p>
                    <p className="dependency-row__detail">Lineage: {service.templateName} ({service.templateId}) → {service.serviceName} → {application.name}</p>
                  </div>
                  <div className="dependency-row__badges">
                    {service.provider && (
                      <Badge variant={service.provider === 'AWS' ? 'aws' : service.provider === 'GCP' ? 'gcp' : 'unknown'}>
                        {service.provider}
                      </Badge>
                    )}
                    <Badge variant={service.status === 'applied' ? 'healthy' : 'degraded'}>
                      {service.status === 'applied' ? 'Template applied' : 'Pending approval'}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {actionFeedback && <p className="action-feedback">{actionFeedback}</p>}
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
            {contextualPrompts.map((query) => (
              <button key={query} type="button" className="ai-prompt-button" onClick={() => submitQuery(query)}>
                {query}
              </button>
            ))}
          </div>

          <div className="ai-response-area" aria-live="polite">
            <div className="ai-structured-block">
              <p className="ai-structured-label">Diagnosis</p>
              <p className="ai-structured-value">{aiResponse.diagnosis}</p>
            </div>
            <div className="ai-structured-block">
              <p className="ai-structured-label">Likely Cause</p>
              <p className="ai-structured-value">{aiResponse.likelyCause}</p>
            </div>
            <div className="ai-structured-block">
              <p className="ai-structured-label">Recommended Action</p>
              <p className="ai-structured-value">{aiResponse.recommendedAction}</p>
              <p className="ai-structured-value ai-structured-value--reason">{aiResponse.recommendedActionReasoning}</p>
            </div>
            <div className="ai-action-row">
              <button type="button" className="incident-button" onClick={() => executeRecommendedAction(aiResponse.action)}>
                {aiResponse.action.label}
              </button>
            </div>
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

    </section>
  );
}
