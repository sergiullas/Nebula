'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CloudTemplate,
  GovernanceStatus,
  TemplateComplexity,
  TemplateGovernanceState,
  TemplateWorkloadType,
} from '@/components/types';

type FlowStep = 'overview' | 'configure' | 'review' | 'done';
type DoneOutcome = 'success' | 'pending-approval';

// ── Shared lookup tables ────────────────────────────────────

const workloadLabels: Record<TemplateWorkloadType, string> = {
  'web-api': 'Web API',
  'data-pipeline': 'Data Pipeline',
  'event-driven': 'Event-Driven',
  'ml-inference': 'ML Inference',
  'static-site': 'Static Site',
};

const governanceLabel: Record<GovernanceStatus, string> = {
  approved: 'Approved',
  'requires-approval': 'Requires approval',
  discouraged: 'Discouraged',
};

const governanceClass: Record<GovernanceStatus, string> = {
  approved: 'gov-approved',
  'requires-approval': 'gov-requires',
  discouraged: 'gov-discouraged',
};

const templateGovernanceLabel: Record<TemplateGovernanceState, string> = {
  approved: 'Fully approved',
  'requires-approval': 'Requires approval',
  'includes-restricted': 'Includes restricted',
};

const templateGovernanceClass: Record<TemplateGovernanceState, string> = {
  approved: 'gov-approved',
  'requires-approval': 'gov-requires',
  'includes-restricted': 'gov-discouraged',
};

const complexityLabel: Record<TemplateComplexity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const STEP_LABELS: Record<FlowStep, string> = {
  overview: 'Overview',
  configure: 'Configure',
  review: 'Review',
  done: 'Done',
};

const STEPS: FlowStep[] = ['overview', 'configure', 'review'];

// ── Step components ─────────────────────────────────────────

type OverviewStepProps = {
  template: CloudTemplate;
  onNext: () => void;
};

function OverviewStep({ template, onNext }: OverviewStepProps) {
  return (
    <>
      <div className="detail-summary-card">
        <div className="detail-summary-name-row">
          <h1 className="detail-service-name">{template.name}</h1>
        </div>
        <p className="detail-summary-meta">
          v{template.version} · Owner: {template.owner} · Updated {template.lastUpdated}
        </p>
        <p className="detail-why-block-text" style={{ marginTop: 12 }}>{template.purpose}</p>
      </div>

      <section className="detail-why-section">
        <p className="detail-section-label">WHEN TO USE</p>
        <div className="detail-why-grid">
          <div className="detail-why-block">
            <p className="detail-why-block-label">RECOMMENDED FOR</p>
            {template.recommendedFor.map((r) => (
              <p key={r} className="detail-impact-note">{r}</p>
            ))}
          </div>
          <div className="detail-why-block">
            <p className="detail-why-block-label">NOT RECOMMENDED FOR</p>
            {template.notRecommendedFor.map((r) => (
              <p key={r} className="detail-impact-note">{r}</p>
            ))}
          </div>
        </div>
        <div className="detail-why-block detail-why-app-context">
          <p className="detail-why-block-label">WHY THIS TEMPLATE EXISTS</p>
          <p className="detail-why-block-text">{template.rationale}</p>
        </div>
      </section>

      <section>
        <p className="detail-section-label">ARCHITECTURE COMPOSITION</p>
        <div className="template-services-table">
          {template.services.map((svc) => (
            <div key={svc.serviceId} className="template-service-row">
              <div className="template-service-main">
                <div className="template-service-name-row">
                  <span className="template-service-name">{svc.name}</span>
                  {svc.required ? (
                    <span className="pill gov-approved">Required</span>
                  ) : (
                    <span className="pill env-pill">Optional</span>
                  )}
                </div>
                <p className="template-service-role">{svc.role}</p>
              </div>
              <div className="template-service-badges">
                <span className="pill env-pill">{svc.category}</span>
                <span className="pill env-pill">{svc.provider}</span>
                <span className={`pill ${governanceClass[svc.governance]}`}>
                  {governanceLabel[svc.governance]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-why-section">
        <p className="detail-section-label">TRADE-OFFS &amp; ALTERNATIVES</p>
        <div className="detail-why-block">
          <p className="detail-why-block-label">TRADE-OFFS</p>
          {template.tradeoffs.map((t) => (
            <p key={t} className="detail-impact-note">{t}</p>
          ))}
        </div>
        <div className="detail-why-block">
          <p className="detail-why-block-label">ALTERNATIVES</p>
          {template.alternatives.map((a) => (
            <p key={a} className="detail-impact-note">{a}</p>
          ))}
        </div>
      </section>

      <button type="button" className="provision-cta-button" onClick={onNext}>
        Configure this template →
      </button>
    </>
  );
}

type ConfigureStepProps = {
  template: CloudTemplate;
  paramValues: Record<string, string>;
  onParamChange: (id: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

function ConfigureStep({ template, paramValues, onParamChange, onBack, onNext }: ConfigureStepProps) {
  return (
    <>
      <div className="detail-summary-card">
        <h2 className="detail-service-name" style={{ fontSize: 'var(--text-xl)' }}>
          Configure {template.name}
        </h2>
        <p className="detail-summary-meta">
          Adjust the parameters below. Locked fields are governed by platform policy.
        </p>
      </div>

      <section className="detail-config-section">
        <p className="detail-section-label">PARAMETERS</p>
        {template.parameters.map((param) => (
          <div key={param.id} className="detail-config-field">
            <label className="detail-config-label" htmlFor={`param-${param.id}`}>
              {param.label}
              {!param.editable && (
                <span className="template-param-locked-badge">Locked</span>
              )}
            </label>
            {param.editable ? (
              <select
                id={`param-${param.id}`}
                className="detail-config-select"
                value={paramValues[param.id]}
                onChange={(e) => onParamChange(param.id, e.target.value)}
              >
                {param.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <>
                <div className="template-param-locked-field">{param.default}</div>
                {param.lockedReason && (
                  <p className="template-param-locked-reason">{param.lockedReason}</p>
                )}
              </>
            )}
          </div>
        ))}
      </section>

      <div className="template-step-actions">
        <button type="button" className="incident-button secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="provision-cta-button template-step-cta" onClick={onNext}>
          Review →
        </button>
      </div>
    </>
  );
}

type ReviewStepProps = {
  template: CloudTemplate;
  paramValues: Record<string, string>;
  onBack: () => void;
  onProvision: () => void;
};

function ReviewStep({ template, paramValues, onBack, onProvision }: ReviewStepProps) {
  return (
    <>
      <div className="detail-summary-card">
        <h2 className="detail-service-name" style={{ fontSize: 'var(--text-xl)' }}>
          Review before provisioning
        </h2>
        <p className="detail-summary-meta">
          Confirm the configuration below. No resources will be created until you confirm.
        </p>
      </div>

      <section>
        <p className="detail-section-label">CONFIGURATION</p>
        <div className="provision-modal-meta" style={{ marginBottom: 0 }}>
          {template.parameters.map((param) => (
            <div key={param.id}>
              <span className="provision-modal-key">{param.label}</span>
              <span>{paramValues[param.id]}</span>
              {!param.editable && <span className="template-param-locked-badge">Locked</span>}
            </div>
          ))}
          <div>
            <span className="provision-modal-key">Actor</span>
            <span>Devin</span>
          </div>
        </div>
      </section>

      <section>
        <p className="detail-section-label">WHAT WILL BE CREATED</p>
        <div className="template-execution-preview">
          <div className="template-preview-group">
            <p className="template-preview-group-label">Resources</p>
            {template.executionPreview.resourcesCreated.map((r) => (
              <p key={r} className="detail-impact-note">{r}</p>
            ))}
          </div>
          <div className="template-preview-group">
            <p className="template-preview-group-label">Actions</p>
            {template.executionPreview.actionsPerformed.map((a) => (
              <p key={a} className="detail-impact-note">{a}</p>
            ))}
          </div>
          {template.executionPreview.integrationsTriggered.length > 0 && (
            <div className="template-preview-group">
              <p className="template-preview-group-label">Integrations</p>
              {template.executionPreview.integrationsTriggered.map((i) => (
                <p key={i} className="detail-impact-note">{i}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="template-step-actions">
        <button type="button" className="incident-button secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="provision-cta-button template-step-cta" onClick={onProvision}>
          {template.governanceState === 'approved' ? 'Provision template' : 'Submit approval request'}
        </button>
      </div>

      <p className="provision-cta-note" style={{ marginTop: 8 }}>
        {template.governanceState === 'approved'
          ? 'All services are pre-approved · Provisioning begins immediately'
          : `Approval required for: ${template.requiresApprovalElements.join(', ')}`}
      </p>
    </>
  );
}

type DoneStepProps = {
  template: CloudTemplate;
  outcome: DoneOutcome;
};

function DoneStep({ template, outcome }: DoneStepProps) {
  if (outcome === 'success') {
    return (
      <div className="template-done-view">
        <div className="provision-outcome provision-outcome-success template-done-card">
          <p className="provision-outcome-title">Template provisioned</p>
          <p className="provision-outcome-body">
            {template.name} has been provisioned successfully. All resources listed in the execution
            preview are being created.
          </p>
          <div className="template-done-resources">
            {template.executionPreview.resourcesCreated.map((r) => (
              <p key={r} className="template-done-resource-item">{r}</p>
            ))}
          </div>
          <Link
            href="/templates"
            className="incident-button"
            style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="template-done-view">
      <div className="provision-outcome provision-outcome-pending template-done-card">
        <p className="provision-outcome-title">Approval request submitted</p>
        <p className="provision-outcome-body">
          {template.name} requires platform team approval before provisioning can proceed. You will
          be notified when the request is reviewed.
        </p>
        <div className="template-done-resources">
          {template.requiresApprovalElements.map((el) => (
            <p key={el} className="template-done-resource-item">Pending approval: {el}</p>
          ))}
        </div>
        <Link
          href="/templates"
          className="incident-button secondary"
          style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}
        >
          Back to Templates
        </Link>
      </div>
    </div>
  );
}

// ── Persistent sidebar ──────────────────────────────────────

type TemplateSidebarProps = {
  template: CloudTemplate;
};

function TemplateSidebar({ template }: TemplateSidebarProps) {
  return (
    <aside className="detail-sidebar">
      <div className="detail-sidebar-block">
        <p className="detail-sidebar-label">GOVERNANCE</p>
        <span
          className={`pill ${templateGovernanceClass[template.governanceState]}`}
          style={{ display: 'inline-block', marginBottom: 8 }}
        >
          {templateGovernanceLabel[template.governanceState]}
        </span>
        {template.approvedComponents.length > 0 && (
          <div className="template-gov-list">
            {template.approvedComponents.map((c) => (
              <p key={c} className="template-gov-item template-gov-approved">✓ {c}</p>
            ))}
          </div>
        )}
        {template.requiresApprovalElements.length > 0 && (
          <div className="template-gov-list">
            {template.requiresApprovalElements.map((c) => (
              <p key={c} className="template-gov-item template-gov-needs-approval">⏳ {c} — requires approval</p>
            ))}
          </div>
        )}
        <p className="detail-sidebar-text" style={{ marginTop: 8 }}>
          Policy sources: {template.policySources.join(' · ')}
        </p>
      </div>

      <div className="detail-sidebar-block">
        <p className="detail-sidebar-label">ESTIMATED COST</p>
        <p className="template-cost-range">
          ${template.estimatedMonthlyCost.min}–${template.estimatedMonthlyCost.max}
          <span className="template-cost-per-month">/mo</span>
        </p>
        <p className="detail-sidebar-text">{template.scalingBehavior}</p>
        <div style={{ marginTop: 8 }}>
          {template.costDrivers.map((d) => (
            <p key={d} className="detail-impact-note">{d}</p>
          ))}
        </div>
      </div>

      <div className="detail-sidebar-block template-ai-block">
        <p className="detail-sidebar-label">AI INSIGHTS</p>
        <div className="template-ai-confidence">
          <div className="template-ai-confidence-bar">
            <div
              className="template-ai-confidence-fill"
              style={{ width: `${template.aiInsight.confidence}%` }}
            />
          </div>
          <span className="template-ai-confidence-label">{template.aiInsight.confidence}% confidence</span>
        </div>
        <div className="template-ai-facts">
          <div className="template-ai-fact">
            <p className="template-ai-fact-label">FIT</p>
            <p className="detail-sidebar-text">{template.aiInsight.fit}</p>
          </div>
          <div className="template-ai-fact">
            <p className="template-ai-fact-label">COST</p>
            <p className="detail-sidebar-text">{template.aiInsight.cost}</p>
          </div>
          <div className="template-ai-fact">
            <p className="template-ai-fact-label">RISK</p>
            <p className="detail-sidebar-text">{template.aiInsight.risk}</p>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <p className="template-ai-fact-label">EVIDENCE</p>
          {template.aiInsight.evidence.map((e) => (
            <p key={e} className="detail-impact-note">{e}</p>
          ))}
        </div>
      </div>

      <div className="detail-sidebar-block">
        <p className="detail-sidebar-label">DETAILS</p>
        <div className="provision-modal-meta" style={{ background: 'transparent', padding: 0, marginBottom: 0 }}>
          <div>
            <span className="provision-modal-key">Version</span>
            <span>{template.version}</span>
          </div>
          <div>
            <span className="provision-modal-key">Complexity</span>
            <span>{complexityLabel[template.complexity]}</span>
          </div>
          <div>
            <span className="provision-modal-key">Provider</span>
            <span>{template.provider}</span>
          </div>
          <div>
            <span className="provision-modal-key">Updated</span>
            <span>{template.lastUpdated}</span>
          </div>
          <div>
            <span className="provision-modal-key">Owner</span>
            <span>{template.owner}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Orchestrator ────────────────────────────────────────────

type TemplateDetailClientProps = {
  template: CloudTemplate;
};

export function TemplateDetailClient({ template }: TemplateDetailClientProps) {
  const [step, setStep] = useState<FlowStep>('overview');
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(template.parameters.map((p) => [p.id, p.default]))
  );
  const [doneOutcome, setDoneOutcome] = useState<DoneOutcome>('success');

  const handleParamChange = (id: string, value: string) => {
    setParamValues((prev: Record<string, string>) => ({ ...prev, [id]: value }));
  };

  const handleProvision = () => {
    const outcome: DoneOutcome = template.governanceState === 'approved' ? 'success' : 'pending-approval';
    setDoneOutcome(outcome);
    setStep('done');
  };

  return (
    <div className="detail-page">
      <div className="detail-nav-bar">
        <Link href="/templates" className="catalog-back-link">
          ← Templates
        </Link>
        <div className="pill-row">
          <span className="pill env-pill">{template.provider}</span>
          <span className="pill env-pill">{workloadLabels[template.type]}</span>
          <span className={`pill ${templateGovernanceClass[template.governanceState]}`}>
            {templateGovernanceLabel[template.governanceState]}
          </span>
        </div>
      </div>

      {step !== 'done' && (
        <div className="template-steps-bar">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`template-step-item ${step === s ? 'active' : ''} ${
                STEPS.indexOf(step) > i ? 'completed' : ''
              }`}
              onClick={() => {
                if (STEPS.indexOf(step) > i) setStep(s);
              }}
              disabled={STEPS.indexOf(step) <= i && step !== s}
            >
              <span className="template-step-number">{i + 1}</span>
              <span className="template-step-label">{STEP_LABELS[s]}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'done' && (
        <DoneStep template={template} outcome={doneOutcome} />
      )}

      {step !== 'done' && (
        <div className="detail-layout">
          <div className="detail-main">
            {step === 'overview' && (
              <OverviewStep
                template={template}
                onNext={() => setStep('configure')}
              />
            )}
            {step === 'configure' && (
              <ConfigureStep
                template={template}
                paramValues={paramValues}
                onParamChange={handleParamChange}
                onBack={() => setStep('overview')}
                onNext={() => setStep('review')}
              />
            )}
            {step === 'review' && (
              <ReviewStep
                template={template}
                paramValues={paramValues}
                onBack={() => setStep('configure')}
                onProvision={handleProvision}
              />
            )}
          </div>
          <TemplateSidebar template={template} />
        </div>
      )}
    </div>
  );
}
