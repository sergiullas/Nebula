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
          `${application.name} in ${environment} is now on ${deploymentVersion} after rollback.`,
          'A recent deployment introduced instability before rollback.',
          'Monitor error rate and latency for 15 minutes before closing the incident.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} degraded after deployment ${deploymentVersion}.`,
          'Timeout-related configuration changes are likely affecting request completion.',
          'Compare timeout settings with the last stable release or roll back safely.',
        );
  }

  if (normalizedQuery === 'what is likely broken?') {
    return didRunRollback
      ? formatAiResponse(
          `${application.name} in ${environment} is improving with health ${health}.`,
          'Residual impact from the prior deployment may still be clearing.',
          'Keep monitoring until failed requests settle near baseline.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} is in ${health} state with elevated failures.`,
          'Request timeouts are likely causing retries and failed transactions.',
          'Validate timeout thresholds and dependency response times immediately.',
        );
  }

  if (normalizedQuery === 'what should i do next?') {
    return didRunRollback
      ? formatAiResponse(
          `${application.name} in ${environment} shows recovery signals after rollback.`,
          'The unstable deployment was likely the main incident trigger.',
          'Continue observation, then document findings and close with a post-incident note.',
        )
      : formatAiResponse(
          `${application.name} in ${environment} needs immediate mitigation in ${health} state.`,
          'Current deployment behavior suggests a configuration regression.',
          'Run rollback to the previous stable version and re-check metrics.',
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

    if (didRunRollback && logsMetrics.rollbackSimulation) {
      return logsMetrics.rollbackSimulation.postRollbackMetrics;
    }

    return logsMetrics.metrics;
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
          'The previous release likely introduced timeout regression.',
          'Monitor for 15 minutes and confirm error trend remains downward.',
        ),
      );
    }, 1500);
  };

  return (
    <section className={`workspace-layout ${isCompanionOpen ? 'drawer-open' : 'drawer-closed'}`}>
      <div className="workspace-main">
        <section className="workspace-header">
          <h1 className="page-title">{application.name}</h1>
          <p className="meta">
            {application.organization} / {application.project}
          </p>
          <div className="pill-row">
            <ProviderBadge provider={application.provider} />
            <HealthBadge health={activeHealth} />
            <span className="pill env-pill">Environment: {currentEnvironment}</span>
          </div>
          <p className="meta health-summary">Current health: {activeHealth} in {currentEnvironment}.</p>
          {application.activeIncident && application.aiSummary && (
            <div className="ai-summary-block">
              <strong>AI Incident Summary</strong>
              <p>{application.aiSummary}</p>
            </div>
          )}
        </section>

        <section className="workspace-tabs" aria-label="Workspace sections">
          <span className="tab-pill active">Overview</span>
          <span className="tab-pill">Logs &amp; Metrics</span>
          <span className="tab-pill">Deployments</span>
          <span className="tab-pill">Services</span>
        </section>

        <section className="section-grid">
          <article className="section-card">
            <h2 className="section-title">Overview</h2>
            <p className="placeholder">Environments: {application.environments.join(', ')}</p>
            <p className="placeholder">Last deployment: {application.lastDeployment}</p>
          </article>

          <article className="section-card">
            <h2 className="section-title">Deployments</h2>
            <p className="placeholder">Deployment history module coming soon.</p>
          </article>

          <article className="section-card">
            <h2 className="section-title">Services</h2>
            <p className="placeholder">Service dependency map coming soon.</p>
          </article>
        </section>

        <section className="logs-metrics-section">
          <h2 className="section-title">Logs &amp; Metrics</h2>
          {logsMetrics && activeMetrics ? (
            <>
              <div className="metrics-grid">
                <article className="metric-card">
                  <p className="metric-label">Error rate</p>
                  <p className="metric-value">{activeMetrics.errorRate}</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Latency P95</p>
                  <p className="metric-value">{activeMetrics.latencyP95}</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Failed requests</p>
                  <p className="metric-value">{activeMetrics.failedRequests}</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Deployment version</p>
                  <p className="metric-value">{activeMetrics.deploymentVersion}</p>
                </article>
              </div>

              <article className="section-card logs-card">
                <h3 className="section-title">Recent logs</h3>
                <ul className="logs-list">
                  {logsMetrics.logs.map((logLine) => (
                    <li key={logLine}>{logLine}</li>
                  ))}
                </ul>
              </article>

              <article className="section-card ai-interpretation">
                <h3 className="section-title">AI Interpretation</h3>
                <p className="placeholder">
                  <strong>Summary:</strong> {logsMetrics.aiInsights.summary}
                </p>
                <p className="placeholder">
                  <strong>Likely cause:</strong> {logsMetrics.aiInsights.likelyCause}
                </p>
                <p className="placeholder">
                  <strong>Recommended next step:</strong> {logsMetrics.aiInsights.nextStep}
                </p>
              </article>
            </>
          ) : (
            <article className="section-card">
              <p className="placeholder">Logs and metrics are unavailable for this application.</p>
            </article>
          )}
        </section>

        {application.activeIncident && (
          <section className="section-card action-panel">
            <h2 className="section-title">Recommended Actions</h2>
            <p className="placeholder">Prototype actions to move from insight to next step.</p>
            <div className="action-row">
              <button type="button" className="action-button">
                Review timeout configuration
              </button>
              <button
                type="button"
                className="action-button secondary"
                onClick={handleRollback}
                disabled={!logsMetrics?.rollbackSimulation || actionStatus === 'running' || didRunRollback}
              >
                {actionStatus === 'running' ? 'Rolling back...' : 'Roll back to previous stable version'}
              </button>
            </div>
            {application.recommendedAction && <p className="placeholder">AI guidance: {application.recommendedAction}</p>}
            {actionFeedback && <p className="action-feedback">{actionFeedback}</p>}
          </section>
        )}
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
            {application.name} · {toTitleCase(currentEnvironment)} · {toTitleCase(activeHealth)}
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
