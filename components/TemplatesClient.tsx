'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CloudApplication, CloudTemplate, TemplateGovernanceState, TemplateWorkloadType } from '@/components/types';
import { EXECUTION_ACTIONS, useActionExecution } from '@/components/execution';

type TemplatesClientProps = {
  templates: CloudTemplate[];
  application?: CloudApplication;
  currentEnvironment?: string;
};

const workloadLabels: Record<TemplateWorkloadType, string> = {
  'web-api': 'Web API',
  'data-pipeline': 'Data Pipeline',
  'event-driven': 'Event-Driven',
  'ml-inference': 'ML Inference',
  'static-site': 'Static Site',
};

const governanceLabel: Record<TemplateGovernanceState, string> = {
  approved: 'Approved',
  'requires-approval': 'Requires approval',
  'includes-restricted': 'Includes restricted services',
};

const governanceClass: Record<TemplateGovernanceState, string> = {
  approved: 'gov-approved',
  'requires-approval': 'gov-requires',
  'includes-restricted': 'gov-discouraged',
};

const ALL = 'All';

const toSentence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0];
  return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
};

const summarizeIncluded = (template: CloudTemplate) =>
  template.services.slice(0, 3).map((service) => service.name).join(', ');

const summarizeConstraints = (template: CloudTemplate) => {
  const editableParams = template.parameters.filter((param) => param.editable);
  if (editableParams.length === 0) {
    return 'Constraints: configuration fixed by policy';
  }

  const fields = editableParams
    .slice(0, 3)
    .map((param) => param.label.toLowerCase())
    .join(', ');

  return `Constraints: configurable ${fields}`;
};

function TemplateCard({
  template,
  application,
  currentEnvironment,
}: {
  template: CloudTemplate;
  application?: CloudApplication;
  currentEnvironment?: string;
}) {
  const recommendation = toSentence(template.aiInsight.fit);
  const purpose = toSentence(template.purpose);
  const router = useRouter();
  const { requestExecution } = useActionExecution();

  const appName = application?.name ?? 'Template Catalog';
  const appId = application?.id ?? 'template-catalog';
  const environment = currentEnvironment ?? 'n/a';

  const inspectionHref = application
    ? `/templates/${template.id}?appId=${application.id}&env=${environment}`
    : `/templates/${template.id}`;

  const handleUseTemplate = () => {
    const defaultConfiguration = template.parameters.map((parameter) => ({
      label: parameter.label,
      value: parameter.default,
    }));

    requestExecution({
      payload: {
        actionType: EXECUTION_ACTIONS.USE_TEMPLATE,
        target: template.name,
        templateId: template.id,
        templateName: template.name,
        appId,
        applicationName: appName,
        provider: application?.provider ?? template.provider,
        environment,
        governanceState: template.governanceState,
        includedServices: template.services.map((service) => service.name),
        configurationParameters: defaultConfiguration,
        impactSummary: `Apply ${template.name} to ${appName}. ${template.services.length} services will be added with template lineage.`,
      },
      onComplete: () => {
        if (application) {
          router.push(`/app/${application.id}?env=${environment}`);
        }
      },
    });
  };

  const isBestMatch = application?.provider === template.provider;

  return (
    <article className="template-card">
      <div className="template-card-header">
        <div className="template-card-title-row">
          <h2 className="template-card-name">{template.name}</h2>
          <span className={`pill ${governanceClass[template.governanceState]}`}>
            {governanceLabel[template.governanceState]}
          </span>
        </div>
        <div className="template-card-meta-row">
          <span className="pill env-pill">{workloadLabels[template.type]}</span>
          <span className="pill env-pill">{template.provider}</span>
          {isBestMatch && <span className="pill gov-approved">Best match for this app</span>}
        </div>
      </div>

      <p className="template-card-purpose">{purpose}</p>

      <div className="template-card-ai-signal" style={{ marginTop: 12 }}>
        <span className="template-card-confidence">Recommendation</span>
        <span>{recommendation}</span>
      </div>

      <div className="template-card-services" style={{ marginTop: 12 }}>
        <p className="detail-impact-note">Includes: {summarizeIncluded(template)}</p>
        <p className="detail-impact-note">
          Cost: Est. ${template.estimatedMonthlyCost.min}–${template.estimatedMonthlyCost.max} / month
        </p>
        <p className="detail-impact-note">{summarizeConstraints(template)}</p>
      </div>

      <div className="template-card-footer" style={{ gap: 8, display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="incident-button" onClick={handleUseTemplate}>
          Use template
        </button>
        <Link href={inspectionHref} className="incident-button secondary" style={{ textDecoration: 'none' }}>
          Inspect details
        </Link>
      </div>
    </article>
  );
}

export function TemplatesClient({ templates, application, currentEnvironment }: TemplatesClientProps) {
  const [activeWorkload, setActiveWorkload] = useState<string>(ALL);
  const [activeGovernance, setActiveGovernance] = useState<string>(ALL);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const allWorkloads = Array.from(new Set(templates.map((t) => t.type)));
  const allGovernance: TemplateGovernanceState[] = ['approved', 'requires-approval', 'includes-restricted'];

  const filtered = useMemo(
    () =>
      templates.filter((t) => {
        if (activeWorkload !== ALL && t.type !== activeWorkload) return false;
        if (activeGovernance !== ALL && t.governanceState !== activeGovernance) return false;
        if (application?.provider && t.provider !== application.provider) return false;
        return true;
      }),
    [activeGovernance, activeWorkload, application?.provider, templates],
  );

  const hasActiveFilter = activeWorkload !== ALL || activeGovernance !== ALL;

  const prioritizedTemplates = [...filtered].sort((a, b) => {
    const aProviderMatch = Number(application?.provider ? a.provider === application.provider : true);
    const bProviderMatch = Number(application?.provider ? b.provider === application.provider : true);
    const governanceScore = (state: TemplateGovernanceState) => {
      if (state === 'approved') return 3;
      if (state === 'requires-approval') return 2;
      return 1;
    };

    const scoreA = aProviderMatch * 100 + governanceScore(a.governanceState) * 10 + a.aiInsight.confidence;
    const scoreB = bProviderMatch * 100 + governanceScore(b.governanceState) * 10 + b.aiInsight.confidence;
    return scoreB - scoreA;
  });

  const recommendedTemplate = prioritizedTemplates[0];
  const remainingRecommended = prioritizedTemplates.slice(1);
  const primaryTemplates = remainingRecommended.slice(0, 3);
  const remainingTemplates = remainingRecommended.slice(3);

  return (
    <div className="templates-page">
      <header className="templates-header">
        <div className="templates-header-text">
          <h1 className="templates-title">Templates</h1>
          <p className="templates-subtitle">
            Templates are the recommended path. Apply a pre-governed architecture to your application, then fine-tune by adding services individually.
          </p>
          {application && (
            <p className="catalog-decision-subtitle" style={{ marginTop: 8 }}>
              Scoped to <strong>{application.name}</strong> · Provider <strong>{application.provider}</strong> · Environment <strong>{currentEnvironment}</strong>
            </p>
          )}
        </div>
        <div className="templates-header-meta">
          <span className="pill env-pill">Start with template (recommended)</span>
          <span className="pill gov-approved">Add services individually (advanced)</span>
        </div>
      </header>

      <div className="templates-layer-note">
        <p className="templates-layer-note-text">
          <strong>Recommended path:</strong><br />
          1. Choose a template<br />
          2. Confirm configuration<br />
          3. Services are created automatically
        </p>
      </div>

      <div className="templates-filters">
        <button
          type="button"
          className="templates-refine-toggle"
          onClick={() => setFiltersExpanded((expanded) => !expanded)}
          aria-expanded={filtersExpanded}
          aria-controls="template-refine-selection"
        >
          Refine selection {filtersExpanded ? '▾' : '▸'}
        </button>

        {filtersExpanded && (
          <div id="template-refine-selection" className="templates-refine-panel">
            <div className="templates-filter-group">
              <span className="templates-filter-label">Workload</span>
              <div className="templates-filter-pills">
                <button type="button" className={`tab-pill ${activeWorkload === ALL ? 'active' : ''}`} onClick={() => setActiveWorkload(ALL)}>All</button>
                {allWorkloads.map((w) => (
                  <button key={w} type="button" className={`tab-pill ${activeWorkload === w ? 'active' : ''}`} onClick={() => setActiveWorkload(w)}>
                    {workloadLabels[w]}
                  </button>
                ))}
              </div>
            </div>

            <div className="templates-filter-group">
              <span className="templates-filter-label">Governance</span>
              <div className="templates-filter-pills">
                <button type="button" className={`tab-pill ${activeGovernance === ALL ? 'active' : ''}`} onClick={() => setActiveGovernance(ALL)}>All</button>
                {allGovernance.filter((g) => templates.some((t) => t.governanceState === g)).map((g) => (
                  <button key={g} type="button" className={`tab-pill ${activeGovernance === g ? 'active' : ''}`} onClick={() => setActiveGovernance(g)}>
                    {governanceLabel[g]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="templates-empty">
          <p className="templates-empty-title">No templates match these filters.</p>
          <button
            type="button"
            className="incident-button secondary"
            onClick={() => {
              setActiveWorkload(ALL);
              setActiveGovernance(ALL);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {recommendedTemplate && (
            <section className="templates-section">
              <div className="templates-section-header">
                <p className="templates-section-label">Recommended for this application</p>
                <p className="templates-section-hint">{toSentence(recommendedTemplate.aiInsight.fit)}</p>
              </div>
              <div className="templates-grid">
                <TemplateCard
                  template={recommendedTemplate}
                  application={application}
                  currentEnvironment={currentEnvironment}
                />
              </div>
            </section>
          )}

          <section className="templates-section">
            <div className="templates-section-header">
              <p className="templates-section-label">
                {hasActiveFilter ? `Matching templates (${remainingRecommended.length})` : 'More templates'}
              </p>
              {!hasActiveFilter && application && (
                <p className="templates-section-hint">
                  Prioritized to match {application.name} provider context ({application.provider})
                </p>
              )}
            </div>
            <div className="templates-grid">
              {primaryTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  application={application}
                  currentEnvironment={currentEnvironment}
                />
              ))}
            </div>
          </section>

          {remainingTemplates.length > 0 && (
            <section className="templates-section">
              <div className="templates-section-header">
                <p className="templates-section-label">More templates</p>
                {!showAll && (
                  <button type="button" className="templates-show-more" onClick={() => setShowAll(true)}>
                    Show {remainingTemplates.length} more
                  </button>
                )}
              </div>
              {showAll && (
                <div className="templates-grid">
                  {remainingTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      application={application}
                      currentEnvironment={currentEnvironment}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
