'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ProviderBadge } from '@/components/ProviderBadge';
import { HealthBadge } from '@/components/HealthBadge';
import { AppLogsMetrics, CloudApplication, HealthStatus } from '@/components/types';

type ApplicationWorkspaceClientProps = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  currentEnvironment: string;
};

const SUPPORTED_QUERIES = ['What is broken?', 'What should I do?', 'What changed?'] as const;

const makeAiResponse = (
  query: string,
  application: CloudApplication,
  activeHealth: HealthStatus,
  activeVersion: string,
  didRunRollback: boolean,
): string => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === 'what is broken?') {
    return didRunRollback
      ? `${application.name} is stabilizing after rollback. Error rate is improving and health is now ${activeHealth}.`
      : `${application.name} is degraded in production. Elevated failures appear linked to deployment ${activeVersion}.`;
  }

  if (normalizedQuery === 'what should i do?') {
    return didRunRollback
      ? 'Continue monitoring for 15 minutes and confirm error rate keeps trending down before closing the incident.'
      : 'Initiate rollback to the previous stable version, then monitor error rate and latency for signs of recovery.';
  }

  if (normalizedQuery === 'what changed?') {
    return didRunRollback
      ? `Rollback completed. Active deployment is now ${activeVersion}, and stability is improving compared with the incident build.`
      : `The latest change was deployment ${activeVersion}, after which timeout-related failures began increasing.`;
  }

  return 'I can help with: "What is broken?", "What should I do?", or "What changed?"';
};

export function ApplicationWorkspaceClient({
  application,
  logsMetrics,
  currentEnvironment,
}: ApplicationWorkspaceClientProps) {
  const [isCompanionOpen, setIsCompanionOpen] = useState(true);
  const [queryInput, setQueryInput] = useState('');
  const [aiResponse, setAiResponse] = useState('Ask about this incident to get contextual guidance.');
  const [actionStatus, setActionStatus] = useState<'idle' | 'running' | 'completed'>('idle');
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
      makeAiResponse(query, application, activeHealth, activeMetrics?.deploymentVersion ?? 'the current build', didRunRollback),
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
      setAiResponse(logsMetrics.rollbackSimulation?.aiConfirmation ?? 'Rollback simulated successfully.');
    }, 1500);
  };

  return (
    <>
      <section className="workspace-layout">
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

        <aside className={`companion-panel ${isCompanionOpen ? 'open' : 'collapsed'}`} aria-label="AI companion panel">
          <button
            type="button"
            className="companion-toggle"
            onClick={() => setIsCompanionOpen((current) => !current)}
            aria-expanded={isCompanionOpen}
          >
            {isCompanionOpen ? 'Hide AI Companion' : 'Show AI Companion'}
          </button>

          {isCompanionOpen && (
            <div className="companion-content">
              <p className="meta">Context: {application.name}</p>
              <div className="companion-quick-actions">
                {SUPPORTED_QUERIES.map((query) => (
                  <button key={query} type="button" className="companion-chip" onClick={() => submitQuery(query)}>
                    {query}
                  </button>
                ))}
              </div>

              <form className="companion-form" onSubmit={handleCompanionSubmit}>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Ask about this issue..."
                  className="companion-input"
                />
                <button type="submit" className="action-button">
                  Ask
                </button>
              </form>

              <div className="companion-response">
                <strong>AI Companion</strong>
                <p>{aiResponse}</p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
