'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ProviderBadge } from '@/components/ProviderBadge';
import { HealthBadge } from '@/components/HealthBadge';
import { ActionStatus, AppLogsMetrics, CloudApplication, HealthStatus } from '@/components/types';

type ApplicationWorkspaceClientProps = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  currentEnvironment: string;
};

const INCIDENT_PROMPTS = ['What changed?', 'What is likely broken?', 'What should I do next?'] as const;

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatAiResponse = (diagnosis: string, likelyCause: string, nextStep: string): string =>
  `Diagnosis: ${diagnosis}\nLikely Cause: ${likelyCause}\nRecommended Next Step: ${nextStep}`;

const createAiResponse = (
  query: string,
  application: CloudApplication,
  environment: string,
  health: HealthStatus,
  deploymentVersion: string,
  didRunRollback: boolean,
): string => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === 'what changed?') {
    return didRunRollback
      ? formatAiResponse(
          `${application.name} in ${environment} is now running ${deploymentVersion} after rollback.`,
          'The prior release likely introduced unstable timeout behavior.',
          'Monitor for 15 minutes and confirm continued metric recovery.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} degraded after deployment ${deploymentVersion}.`,
          'Timeout-related configuration drift is the strongest signal.',
          'Compare with the previous stable release or execute rollback.',
        );
  }

  if (normalizedQuery === 'what is likely broken?') {
    return didRunRollback
      ? formatAiResponse(
          `${application.name} in ${environment} is in ${health} and stabilizing.`,
          'Residual retries may persist briefly after rollback.',
          'Continue observation until failures return near baseline.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} is ${health} with elevated failures.`,
          'Request timeout thresholds are likely too strict for current load.',
          'Review timeout and dependency latency paths immediately.',
        );
  }

  if (normalizedQuery === 'what should i do next?') {
    return didRunRollback
      ? formatAiResponse(
          `${application.name} in ${environment} shows positive post-rollback trend.`,
          'The incident was likely tied to the reverted deployment.',
          'Keep monitoring and capture the change diff for follow-up.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} needs immediate mitigation in ${health}.`,
          'Current build behavior indicates configuration regression risk.',
          'Run rollback to the previous stable version now.',
        );
  }

  return 'I cannot answer that in this context. Try one of the suggested prompts.';
};

export function ApplicationWorkspaceClient({
  application,
  logsMetrics,
  currentEnvironment,
}: ApplicationWorkspaceClientProps) {
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [aiResponse, setAiResponse] = useState('Select a prompt or ask a supported question.');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [didRunRollback, setDidRunRollback] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const activeMetrics = useMemo(() => {
    if (!logsMetrics) {
      return undefined;
    }

    return didRunRollback && logsMetrics.rollbackSimulation
      ? logsMetrics.rollbackSimulation.postRollbackMetrics
      : logsMetrics.metrics;
  }, [didRunRollback, logsMetrics]);

  const activeHealth = useMemo<HealthStatus>(() => {
    if (didRunRollback && logsMetrics?.rollbackSimulation) {
      return logsMetrics.rollbackSimulation.postRollbackHealth;
    }

    return application.health;
  }, [application.health, didRunRollback, logsMetrics]);

  const submitQuery = (query: string) => {
    setAiResponse(
      createAiResponse(
        query,
        application,
        currentEnvironment,
        activeHealth,
        activeMetrics?.deploymentVersion ?? 'current deployment',
        didRunRollback,
      ),
    );
  };

  const handleCompanionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuery(queryInput);
  };

  const handleRollback = () => {
    if (!logsMetrics?.rollbackSimulation || actionStatus === 'running' || didRunRollback) {
      return;
    }

    setActionStatus('running');
    setActionFeedback('Simulating rollback...');

    window.setTimeout(() => {
      setDidRunRollback(true);
      setActionStatus('completed');
      setActionFeedback(logsMetrics.rollbackSimulation?.aiConfirmation ?? 'Rollback simulated successfully.');
      setAiResponse(
        formatAiResponse(
          `${application.name} in ${currentEnvironment} moved to ${logsMetrics.rollbackSimulation?.postRollbackMetrics.deploymentVersion ?? 'stable build'}.`,
          'The previous deployment likely caused timeout regression.',
          'Continue monitoring before closing the incident.',
        ),
      );
    }, 1500);
  };

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
              <ProviderBadge provider={application.provider} />
              <span className="pill env-pill">{currentEnvironment}</span>
              <HealthBadge health={activeHealth} />
            </div>
          </div>
          <p className="workspace-user">Signed in as Devin</p>
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
                onClick={handleRollback}
                disabled={!logsMetrics?.rollbackSimulation || actionStatus === 'running' || didRunRollback}
              >
                {actionStatus === 'running' ? 'Rolling back...' : 'Roll back to v1.23'}
              </button>
              <button type="button" className="incident-button secondary">
                Review config
              </button>
            </div>
          </section>
        ) : (
          <section className="status-banner">
            <span className="status-dot" /> All environments healthy · Last deployment {application.lastDeployment} · No active
            incidents
          </section>
        )}

        <nav className="workspace-tabs" aria-label="Workspace sections">
          <span className="tab-pill active">Overview</span>
          <span className="tab-pill">Logs &amp; metrics</span>
          <span className="tab-pill">Deployments</span>
          <span className="tab-pill">Services</span>
        </nav>

        {logsMetrics && activeMetrics && (
          <section className="metrics-grid">
            <article className="metric-card">
              <p className="metric-label">ERROR RATE</p>
              <p className="metric-value">{activeMetrics.errorRate}</p>
              <p className="metric-subtext">{activeHealth === 'critical' ? 'Critical' : 'Normal'}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">LATENCY P95</p>
              <p className="metric-value">{activeMetrics.latencyP95}</p>
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

        <p className="overview-title">APPLICATION OVERVIEW</p>

        <section className="section-grid">
          <article className="section-card">
            <h2 className="section-title">Environments</h2>
            <p className="placeholder">{application.environments.join(' · ')}</p>
            <p className="placeholder">All environments healthy</p>
          </article>

          <article className="section-card">
            <h2 className="section-title">Deployments</h2>
            <p className="placeholder muted">Deployment history coming soon</p>
          </article>

          <article className="section-card">
            <h2 className="section-title">Services</h2>
            <p className="placeholder muted">Service dependency map coming soon</p>
          </article>
        </section>

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
          <h3 className="ai-drawer-title">AI Assistant</h3>
          <p className="ai-context-line">
            {application.name} · {toTitleCase(currentEnvironment)}
          </p>

          <div className="ai-prompt-list" aria-label="Suggested prompts">
            {INCIDENT_PROMPTS.map((query) => (
              <button key={query} type="button" className="ai-prompt-button" onClick={() => submitQuery(query)}>
                {query}
              </button>
            ))}
          </div>

          <div className="ai-response-area" aria-live="polite">
            {aiResponse}
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
