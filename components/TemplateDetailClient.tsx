'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CloudApplication, CloudTemplate, TemplateGovernanceState } from '@/components/types';
import { EXECUTION_ACTIONS, useActionExecution } from '@/components/execution';

type TemplateDetailClientProps = {
  template: CloudTemplate;
  application?: CloudApplication;
  currentEnvironment?: string;
};

type TemplateOutcome = {
  tone: 'success' | 'pending';
  title: string;
  body: string;
  detail: string;
} | null;

const governanceLabel: Record<TemplateGovernanceState, string> = {
  approved: 'Approved',
  'requires-approval': 'Requires approval',
  'includes-restricted': 'Discouraged',
};

const governanceClass: Record<TemplateGovernanceState, string> = {
  approved: 'gov-approved',
  'requires-approval': 'gov-requires',
  'includes-restricted': 'gov-discouraged',
};

const buildInitialParamValues = (template: CloudTemplate, envOverride?: string) =>
  Object.fromEntries(
    template.parameters.map((param) => {
      if (param.id === 'environment' && envOverride && param.options.includes(envOverride)) {
        return [param.id, envOverride];
      }
      return [param.id, param.default];
    }),
  );

const getParamValue = (values: Record<string, string>, template: CloudTemplate, idMatcher: (id: string) => boolean, fallback: string) => {
  const entry = template.parameters.find((param) => idMatcher(param.id));
  return (entry ? values[entry.id] : undefined) ?? fallback;
};

export function TemplateDetailClient({ template, application, currentEnvironment }: TemplateDetailClientProps) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    buildInitialParamValues(template, currentEnvironment),
  );
  const [outcome, setOutcome] = useState<TemplateOutcome>(null);
  const { requestExecution } = useActionExecution();

  useEffect(() => {
    setParamValues(buildInitialParamValues(template, currentEnvironment));
    setOutcome(null);
  }, [template, application?.id, currentEnvironment]);

  const appName = application?.name ?? 'Template Catalog';
  const appId = application?.id ?? 'template-catalog';
  const appProvider = application?.provider ?? template.provider;

  const environment = getParamValue(paramValues, template, (id) => id === 'environment', currentEnvironment ?? 'dev');
  const region = getParamValue(paramValues, template, (id) => id === 'region', 'provider-default');
  const sizeTier = getParamValue(paramValues, template, (id) => /size|instance|node|tier/i.test(id), 'standard');

  const backToTemplatesHref = application
    ? `/templates?appId=${application.id}&env=${environment}`
    : '/templates';

  const backToServicesHref = application
    ? `/app/${application.id}?env=${environment}`
    : '/templates';

  const editableParameterCount = useMemo(
    () => template.parameters.filter((param) => param.editable).length,
    [template.parameters],
  );

  const handleUseTemplate = () => {
    const allConfiguredValues = template.parameters
      .map((param) => `${param.label}: ${paramValues[param.id] ?? param.default}`)
      .join(' · ');

    requestExecution({
      payload: {
        actionType: EXECUTION_ACTIONS.USE_TEMPLATE,
        target: template.name,
        templateName: template.name,
        appId,
        applicationName: appName,
        provider: appProvider,
        governanceState: template.governanceState,
        environment,
        includedServices: template.services.map((service) => service.name),
        region,
        sizeTier,
        details: allConfiguredValues,
        impactSummary: `Apply ${template.name} to ${appName}. This will create ${template.services.length} services with template origin lineage in Services.`,
      },
      onComplete: () => {
        const serviceList = template.services.map((service) => service.name).join(', ');
        const baseDetail = `${template.services.length} services added: ${serviceList}.`;

        if (template.governanceState === 'approved') {
          setOutcome({
            tone: 'success',
            title: 'Template applied successfully',
            body: `${template.name} has been added to ${appName}.`,
            detail: baseDetail,
          });
          return;
        }

        if (template.governanceState === 'requires-approval') {
          setOutcome({
            tone: 'pending',
            title: 'Template request submitted',
            body: `${template.name} is pending approval for ${appName}.`,
            detail: `${baseDetail} Governance status: pending approval.`,
          });
          return;
        }

        setOutcome({
          tone: 'pending',
          title: 'Template exception request submitted',
          body: `${template.name} includes discouraged services and requires exception review for ${appName}.`,
          detail: `${baseDetail} Governance status: exception review pending.`,
        });
      },
    });
  };

  return (
    <div className="detail-page">
      <div className="detail-nav-bar">
        <Link href={backToTemplatesHref} className="catalog-back-link">
          ← Back to templates
        </Link>
        <div className="pill-row">
          <span className="pill env-pill">Application: {appName}</span>
          <span className="pill env-pill">Provider: {appProvider}</span>
          <span className="pill env-pill">Environment: {environment}</span>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-summary-card">
            <p className="detail-section-label">DECISION SUMMARY</p>
            <div className="detail-summary-name-row">
              <h1 className="detail-service-name">{template.name}</h1>
            </div>
            <p className="detail-summary-meta">{template.provider} · {template.type} · {template.version}</p>
            <div className="pill-row" style={{ marginTop: 8 }}>
              <span className="pill gov-approved">Recommended for app build-out</span>
              <span className={`pill ${governanceClass[template.governanceState]}`}>{governanceLabel[template.governanceState]}</span>
              <span className="pill env-pill">${template.estimatedMonthlyCost.min}–${template.estimatedMonthlyCost.max} / month</span>
            </div>
            <p className="detail-impact-note" style={{ marginTop: 12 }}>{template.purpose}</p>
          </section>

          <section className="detail-why-section">
            <p className="detail-section-label">WHAT THIS TEMPLATE CREATES</p>
            <div className="template-services-table">
              {template.services.map((service) => (
                <div key={service.serviceId} className="template-service-row">
                  <div className="template-service-main">
                    <div className="template-service-name-row">
                      <span className="template-service-name">{service.name}</span>
                      <span className="pill env-pill">{service.category}</span>
                    </div>
                    <p className="template-service-role">{service.role}</p>
                  </div>
                  <div className="template-service-badges">
                    <span className="pill env-pill">{service.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-why-section">
            <p className="detail-section-label">WHY THIS FITS YOUR APP</p>
            <div className="detail-why-grid">
              <div className="detail-why-block">
                <p className="detail-why-block-label">BEST FOR</p>
                {template.recommendedFor.slice(0, 3).map((item) => (
                  <p key={item} className="detail-impact-note">{item}</p>
                ))}
              </div>
              <div className="detail-why-block">
                <p className="detail-why-block-label">AVOID IF</p>
                {template.notRecommendedFor.slice(0, 3).map((item) => (
                  <p key={item} className="detail-impact-note">{item}</p>
                ))}
              </div>
            </div>
            <div className="detail-why-block detail-why-app-context">
              <p className="detail-why-block-label">RECOMMENDATION BASIS</p>
              <p className="detail-why-block-text">{template.aiInsight.fit}</p>
            </div>
          </section>

          <section className="detail-config-section">
            <p className="detail-section-label">CONFIGURATION</p>
            <p className="detail-impact-note" style={{ marginBottom: 12 }}>
              {editableParameterCount} editable parameter{editableParameterCount === 1 ? '' : 's'} available for this template.
            </p>
            {template.parameters.map((param) => {
              const value = paramValues[param.id] ?? param.default;
              return (
                <div key={param.id} className="detail-config-field">
                  <label className="detail-config-label" htmlFor={`template-param-${param.id}`}>{param.label}</label>
                  {param.editable ? (
                    <select
                      id={`template-param-${param.id}`}
                      className="detail-config-select"
                      value={value}
                      onChange={(event) => setParamValues((prev) => ({ ...prev, [param.id]: event.target.value }))}
                    >
                      {param.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="template-param-locked-field">{value}</div>
                      {param.lockedReason && (
                        <p className="template-param-locked-reason">{param.lockedReason}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </section>

          <section className="detail-why-section">
            <p className="detail-section-label">GOVERNANCE / RISK / IMPACT</p>
            <div className="detail-why-block">
              <p className="detail-impact-note">Governance state: {governanceLabel[template.governanceState]}.</p>
              <p className="detail-impact-note">Cost band: ${template.estimatedMonthlyCost.min}–${template.estimatedMonthlyCost.max} monthly estimate.</p>
              <p className="detail-impact-note">Constraints: {template.restrictedOptions.length ? template.restrictedOptions.join(', ') : 'No restricted options in template baseline.'}</p>
              <p className="detail-impact-note">Impact notes: {template.aiInsight.risk}</p>
            </div>
          </section>

          <section className="template-step-actions" style={{ marginTop: 18 }}>
            <button type="button" className="provision-cta-button template-step-cta" onClick={handleUseTemplate}>
              Use template
            </button>
            <Link href={backToTemplatesHref} className="incident-button secondary" style={{ textDecoration: 'none' }}>
              Back to templates
            </Link>
          </section>

          {outcome && (
            <section className={`provision-outcome ${outcome.tone === 'success' ? 'provision-outcome-success' : 'provision-outcome-pending'}`} style={{ marginTop: 18 }}>
              <p className="provision-outcome-title">{outcome.title}</p>
              <p className="provision-outcome-body">{outcome.body}</p>
              <p className="provision-outcome-body">{outcome.detail}</p>
              <Link href={backToServicesHref} className="incident-button" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
                View resulting Services
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
