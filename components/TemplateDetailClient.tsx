'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CloudTemplate,
  GovernanceStatus,
  TemplateComplexity,
  TemplateGovernanceState,
  TemplateWorkloadType,
} from '@/components/types';
import { ACTION_LABELS, useActionExecution } from '@/components/execution';

type FlowStep = 'inspect' | 'configure' | 'review' | 'done';
type DoneOutcome = 'success' | 'pending-approval' | 'blocked-by-policy';

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
  approved: 'Approved',
  'requires-approval': 'Requires approval',
  'includes-restricted': 'Includes restricted services',
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
  inspect: 'Inspect',
  configure: 'Configure',
  review: 'Review',
  done: 'Done',
};

const STEPS: FlowStep[] = ['inspect', 'configure', 'review'];

type ConstraintRule = {
  blockedValues: string[];
  explanation: string;
  suggestedAlternative?: string;
  exceptionPath?: string;
};

const constraintRulesByTemplate: Record<string, Record<string, ConstraintRule>> = {
  'realtime-analytics-pipeline': {
    region: {
      blockedValues: ['asia-east1'],
      explanation: 'asia-east1 is restricted due to data residency policy.',
      suggestedAlternative: 'us-central1',
    },
  },
  'event-driven-microservice': {
    region: {
      blockedValues: ['eu-west-1'],
      explanation: 'eu-west-1 is currently restricted for this async pattern due to unresolved compliance controls.',
      exceptionPath: 'Request a governed exception through Cloud Platform review workflow.',
    },
  },
};

const groupLabelForParam = (paramId: string, label: string) => {
  const value = `${paramId} ${label}`.toLowerCase();
  if (value.includes('environment')) return 'Environment';
  if (value.includes('region') || value.includes('residency') || value.includes('availability')) return 'Deployment';
  if (value.includes('size') || value.includes('capacity') || value.includes('instance') || value.includes('node')) return 'Scale';
  return 'Additional';
};

const estimateConfiguredCost = (template: CloudTemplate, paramValues: Record<string, string>) => {
  let multiplier = 1;
  const allValues = Object.values(paramValues).join(' ');

  if (/\blarge\b/i.test(allValues)) multiplier += 0.35;
  if (/\bmedium\b/i.test(allValues)) multiplier += 0.15;
  if (/\bprod\b/i.test(allValues)) multiplier += 0.2;
  if (/\bstaging\b/i.test(allValues)) multiplier += 0.1;
  if (/\bnearline\b/i.test(allValues)) multiplier -= 0.08;

  const min = Math.round(template.estimatedMonthlyCost.min * multiplier);
  const max = Math.round(template.estimatedMonthlyCost.max * multiplier);
  return { min, max };
};

// ── Step components ─────────────────────────────────────────

type InspectStepProps = {
  template: CloudTemplate;
  onNext: () => void;
};

function InspectStep({ template, onNext }: InspectStepProps) {
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
  onOutOfRangeAttempt: (message: string) => void;
  blockedMessage: string;
  configuredCost: { min: number; max: number };
  onBack: () => void;
  onNext: () => void;
};

function ConfigureStep({
  template,
  paramValues,
  onParamChange,
  onOutOfRangeAttempt,
  blockedMessage,
  configuredCost,
  onBack,
  onNext,
}: ConfigureStepProps) {
  const groupedParams = useMemo(() => {
    const groups = new Map<string, typeof template.parameters>();
    template.parameters.forEach((param) => {
      const group = groupLabelForParam(param.id, param.label);
      const existing = groups.get(group) ?? [];
      groups.set(group, [...existing, param]);
    });
    return groups;
  }, [template]);

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
        <p className="detail-section-label">PARAMETERS BY SECTION</p>
        {[...groupedParams.entries()].map(([group, params]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <p className="detail-why-block-label">{group}</p>
            {params.map((param) => (
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

                {param.editable && param.options.length > 0 && (
                  <button
                    type="button"
                    className="incident-button secondary"
                    style={{ marginTop: 8 }}
                    onClick={() => onOutOfRangeAttempt(`custom-${param.id}`)}
                  >
                    Simulate out-of-range attempt
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}

        {blockedMessage && (
          <div className="provision-outcome provision-outcome-exception" style={{ marginBottom: 14 }}>
            <p className="provision-outcome-title">Change blocked by policy</p>
            <p className="provision-outcome-body">{blockedMessage}</p>
          </div>
        )}

        <div className="detail-why-block" style={{ marginTop: 8 }}>
          <p className="detail-why-block-label">DYNAMIC COST PREVIEW</p>
          <p className="detail-why-block-text">
            Estimated range for current selections: ${configuredCost.min}–${configuredCost.max} / month
          </p>
        </div>
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
  configuredCost: { min: number; max: number };
  onBack: () => void;
  onProvision: () => void;
};

function ReviewStep({ template, paramValues, configuredCost, onBack, onProvision }: ReviewStepProps) {
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

      <section className="detail-why-section">
        <p className="detail-section-label">GOVERNANCE &amp; COST IMPACT</p>
        <div className="detail-why-block">
          <p className="detail-impact-note">Approved components: {template.approvedComponents.join(', ') || 'None listed'}</p>
          {template.requiresApprovalElements.length > 0 && (
            <p className="detail-impact-note">
              Requires approval: {template.requiresApprovalElements.join(', ')}
            </p>
          )}
          {template.restrictedOptions.length > 0 && (
            <p className="detail-impact-note">
              Restricted options: {template.restrictedOptions.join(', ')}
            </p>
          )}
          <p className="detail-impact-note">
            Estimated monthly cost for this configuration: ${configuredCost.min}–${configuredCost.max}
          </p>
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
          {template.governanceState === 'approved'
            ? 'Provision template'
            : template.governanceState === 'includes-restricted'
              ? 'Submit exception request'
              : 'Submit approval request'}
        </button>
      </div>

      <p className="provision-cta-note" style={{ marginTop: 8 }}>
        {template.governanceState === 'approved'
          ? 'All services are pre-approved · Provisioning begins immediately'
          : template.governanceState === 'includes-restricted'
            ? `Restricted services present: ${template.restrictedOptions.join(', ')}`
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

  if (outcome === 'blocked-by-policy') {
    return (
      <div className="template-done-view">
        <div className="provision-outcome provision-outcome-exception template-done-card">
          <p className="provision-outcome-title">Provisioning blocked by policy</p>
          <p className="provision-outcome-body">
            {template.name} includes services that cannot be provisioned under current platform
            policy. No compliant configuration path is available without a governed exception.
          </p>
          {template.restrictedOptions.length > 0 && (
            <div className="template-done-resources">
              {template.restrictedOptions.map((opt) => (
                <p key={opt} className="template-done-resource-item">Restricted: {opt}</p>
              ))}
            </div>
          )}
          <p className="provision-outcome-body" style={{ marginTop: 8 }}>
            Policy source{template.policySources.length !== 1 ? 's' : ''}: {template.policySources.join(' · ')}
          </p>
          <p className="provision-outcome-body" style={{ marginTop: 8 }}>
            To proceed, request a governed exception through the Cloud Platform review workflow,
            or choose a template that does not include restricted services.
          </p>
          <Link
            href="/templates"
            className="incident-button"
            style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}
          >
            Browse compliant templates
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
  const [step, setStep] = useState<FlowStep>('inspect');
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(template.parameters.map((p) => [p.id, p.default]))
  );
  const [doneOutcome, setDoneOutcome] = useState<DoneOutcome>('success');
  const { requestAction } = useActionExecution();
  const [blockedMessage, setBlockedMessage] = useState('');

  const handleParamChange = (id: string, value: string) => {
    const templateRules = constraintRulesByTemplate[template.id] ?? {};
    const rule = templateRules[id];
    if (rule && rule.blockedValues.includes(value)) {
      const suffix = rule.suggestedAlternative
        ? ` Recommended alternative: ${rule.suggestedAlternative}.`
        : rule.exceptionPath
          ? ` ${rule.exceptionPath}`
          : '';
      setBlockedMessage(`${rule.explanation}${suffix}`);
      return;
    }

    setBlockedMessage('');
    setParamValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleOutOfRangeAttempt = (id: string) => {
    const param = template.parameters.find((entry) => entry.id === id.replace('custom-', ''));
    const explanation = param?.label
      ? `The selected value is outside allowed values for ${param.label}. Choose one of the approved options or submit a governed exception request.`
      : 'The selected value is outside policy-allowed values.';
    setBlockedMessage(explanation);
  };

  const configuredCost = useMemo(() => estimateConfiguredCost(template, paramValues), [paramValues, template]);

  const handleProvision = () => {
    requestAction({
      actionType: ACTION_LABELS.useTemplate,
      source: 'template',
      target: template.name,
      provider: template.provider,
      governanceState: template.governanceState,
      impactSummary: `Use template ${template.name} to provision its configured resources.`,
      governanceSignal: templateGovernanceLabel[template.governanceState],
      confirmLabel: 'Confirm use template',
      onExecute: () => {
        if (template.governanceState === 'approved') {
          return { status: 'success', message: `Template used successfully: ${template.name}.` };
        }
        if (template.governanceState === 'requires-approval') {
          return { status: 'success', message: `Template request submitted for approval: ${template.name}.` };
        }
        return { status: 'failure', message: `Template blocked by policy: ${template.name}.` };
      },
      onComplete: (result) => {
        let outcome: DoneOutcome;
        if (result.status === 'failure' || template.governanceState === 'includes-restricted') {
          outcome = 'blocked-by-policy';
        } else if (template.governanceState === 'requires-approval') {
          outcome = 'pending-approval';
        } else {
          outcome = 'success';
        }
        setDoneOutcome(outcome);
        setStep('done');
      },
    });
  };

  return (
    <div className="detail-page">
      <div className="detail-nav-bar">
        <Link href="/templates" className="catalog-back-link">
          ← Templates
        </Link>
        <div className="template-step-actions">
          <button
            type="button"
            className={`incident-button secondary ${step === 'inspect' ? 'active' : ''}`}
            onClick={() => setStep('inspect')}
          >
            Inspect
          </button>
          <button
            type="button"
            className={`incident-button ${step === 'configure' || step === 'review' ? 'active' : ''}`}
            onClick={() => setStep(step === 'done' ? 'inspect' : 'configure')}
          >
            Configure
          </button>
        </div>
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
            {step === 'inspect' && (
              <InspectStep
                template={template}
                onNext={() => setStep('configure')}
              />
            )}
            {step === 'configure' && (
              <ConfigureStep
                template={template}
                paramValues={paramValues}
                onParamChange={handleParamChange}
                onOutOfRangeAttempt={handleOutOfRangeAttempt}
                blockedMessage={blockedMessage}
                configuredCost={configuredCost}
                onBack={() => setStep('inspect')}
                onNext={() => setStep('review')}
              />
            )}
            {step === 'review' && (
              <ReviewStep
                template={template}
                paramValues={paramValues}
                configuredCost={configuredCost}
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
