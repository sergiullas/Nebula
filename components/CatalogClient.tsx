'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CatalogService, CloudApplication, CloudTemplate, GovernanceStatus, FitSignal } from '@/components/types';
import { ProviderBadge } from '@/components/ProviderBadge';

type CatalogClientProps = {
  application: CloudApplication;
  services: CatalogService[];
  currentEnvironment: string;
  templateAlternatives: CloudTemplate[];
};

const ALL_CATEGORY = 'All';
const EXISTING_SERVICES_BY_APP: Record<string, string[]> = {
  'payments-api': ['API Gateway', 'IAM', 'CloudWatch'],
  'forecast-engine': ['Cloud Scheduler', 'IAM', 'Logging'],
  'ops-dashboard': ['Cloud Run', 'Internal Identity', 'Alerting'],
};

const INFERRED_GOAL_BY_APP: Record<string, string> = {
  'payments-api': 'Strengthen transactional reliability while keeping provisioning within approved paths.',
  'forecast-engine': 'Improve analytics throughput with predictable monthly cost.',
  'ops-dashboard': 'Add capabilities with minimal operational overhead and fast governance approval.',
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

const fitDotClass: Record<FitSignal, string> = {
  recommended: 'fit-dot-recommended',
  suitable: 'fit-dot-suitable',
  alternative: 'fit-dot-alternative',
  'not-recommended': 'fit-dot-not-recommended',
};

const complexityBySignal: Record<FitSignal, 'Low' | 'Medium' | 'High'> = {
  recommended: 'Low',
  suitable: 'Medium',
  alternative: 'Medium',
  'not-recommended': 'High',
};

const governanceSummary: Record<GovernanceStatus, string> = {
  approved: 'Approved path with no extra review gate.',
  'requires-approval': 'Usable, but includes an approval checkpoint.',
  discouraged: 'Discouraged path; exception review required.',
};

const serviceTradeoff = (service: CatalogService) => {
  const impactNote = service.detail.impactNotes[0] ?? service.detail.bestFor;
  return `${service.costLabel} cost with ${complexityBySignal[service.fit.signal].toLowerCase()} implementation complexity. ${impactNote}`;
};

const serviceImpactPreview = (service: CatalogService) => ({
  system: service.detail.impactNotes[0] ?? service.detail.bestFor,
  cost: service.costEstimate,
  integration: service.detail.impactNotes[2] ?? service.fit.basis,
});

type ServiceGroup = {
  id: 'recommended' | 'alternatives' | 'advanced';
  title: string;
  subtitle: string;
  services: CatalogService[];
};

export function CatalogClient({ application, services, currentEnvironment, templateAlternatives }: CatalogClientProps) {
  const categories = [ALL_CATEGORY, ...Array.from(new Set(services.map((s) => s.category)))];
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const existingServices = EXISTING_SERVICES_BY_APP[application.id] ?? ['Core networking', 'Identity', 'Observability'];
  const inferredGoal = INFERRED_GOAL_BY_APP[application.id] ?? 'Add the next best-fit capability with clear governance and impact visibility.';

  const filtered = activeCategory === ALL_CATEGORY ? services : services.filter((s) => s.category === activeCategory);
  const recommendedTemplates = templateAlternatives.slice(0, 2);
  const templateSuggestionText = recommendedTemplates.length > 0
    ? recommendedTemplates.map((template) => template.name).join(' · ')
    : 'Governed template path is available for this provider.';

  const groupedServices = useMemo<ServiceGroup[]>(
    () => [
      {
        id: 'recommended',
        title: 'Recommended (best fit)',
        subtitle: 'Primary options aligned to this application context.',
        services: filtered.filter((service) => service.fit.signal === 'recommended' || service.fit.signal === 'suitable'),
      },
      {
        id: 'alternatives',
        title: 'Alternatives',
        subtitle: 'Viable choices with fit or model tradeoffs.',
        services: filtered.filter((service) => service.fit.signal === 'alternative'),
      },
      {
        id: 'advanced',
        title: 'Advanced / higher complexity',
        subtitle: 'Higher-cost or governance-heavy paths requiring stronger justification.',
        services: filtered.filter(
          (service) => service.fit.signal === 'not-recommended' || service.governance !== 'approved' || complexityBySignal[service.fit.signal] === 'High',
        ),
      },
    ],
    [filtered],
  );

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div className="catalog-header-left">
          <Link href={`/app/${application.id}`} className="catalog-back-link">
            ← {application.name}
          </Link>
          <h1 className="catalog-title">Services for {application.name}</h1>
          <p className="catalog-subtitle">
            {application.provider} application context · {application.organization}
          </p>
          <p className="catalog-decision-title">Choose how to build your application.</p>
          <p className="catalog-decision-subtitle">AI suggests options with reasoning. You decide what to provision.</p>
        </div>
        <div className="pill-row">
          <ProviderBadge provider={application.provider} />
          <span className="pill env-pill">{currentEnvironment}</span>
        </div>
      </header>

      <section className="catalog-context-banner">
        <p className="catalog-context-row">
          <strong>Application:</strong> {application.name}
        </p>
        <p className="catalog-context-row">
          <strong>Provider / Environment:</strong> {application.provider} · {currentEnvironment}
        </p>
        <p className="catalog-context-row">
          <strong>Existing services:</strong> {existingServices.join(', ')}
        </p>
        <p className="catalog-context-row">
          <strong>Inferred goal:</strong> {inferredGoal}
        </p>
      </section>

      <section className="templates-layer-note" style={{ marginBottom: 16 }}>
        <p className="templates-layer-note-text">
          <strong>Template-first guidance:</strong> Templates are the safer, governed path.
        </p>
        <p className="catalog-decision-subtitle">
          Relevant templates for this context: {templateSuggestionText}
        </p>
        <div className="toggle-row" style={{ marginTop: 10 }}>
          <Link href={`/templates?appId=${application.id}&env=${currentEnvironment}`} className="incident-button">
            Start with template
          </Link>
          <Link href={`/app/${application.id}/catalog?env=${currentEnvironment}`} className="incident-button secondary" aria-current="page">
            Add services individually
          </Link>
        </div>
      </section>
      <nav className="catalog-tabs" aria-label="Service categories">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`tab-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="catalog-decision-groups">
        {groupedServices.map((group) => {
          const uniqueServices = group.services.filter((service, index, source) => source.findIndex((s) => s.id === service.id) === index);
          if (uniqueServices.length === 0) {
            return null;
          }

          return (
            <section key={group.id} className="catalog-group-section" aria-label={group.title}>
              <div className="catalog-group-header">
                <h2 className="catalog-group-title">{group.title}</h2>
                <p className="catalog-group-subtitle">{group.subtitle}</p>
              </div>

              <div className="catalog-grid">
                {uniqueServices.map((service) => {
                  const impact = serviceImpactPreview(service);
                  const previewExpanded = expandedPreviewId === service.id;
                  const serviceHref = `/app/${application.id}/catalog/${service.id}`;

                  return (
                    <article key={service.id} className="service-card">
                      <div className="service-card-top">
                        <h3 className="service-card-name">{service.name}</h3>
                        <ProviderBadge provider={service.provider} />
                      </div>
                      <p className="service-card-desc">{service.description}</p>
                      <div className={`service-card-fit ${fitDotClass[service.fit.signal]}`}>
                        <span className="fit-dot" />
                        <span>{service.fit.label}</span>
                      </div>
                      <p className="service-reasoning">
                        <strong>Recommended because:</strong> {service.fit.appContext}
                      </p>
                      <div className="service-card-footer">
                        <span className={`pill ${governanceClass[service.governance]}`}>
                          {governanceLabel[service.governance]}
                        </span>
                        <span className="pill env-pill">Cost range: {service.costEstimate}</span>
                        <span className="pill env-pill">Complexity: {complexityBySignal[service.fit.signal]}</span>
                      </div>
                      <p className="service-tradeoff">{serviceTradeoff(service)}</p>
                      <p className="service-tradeoff">{governanceSummary[service.governance]}</p>

                      <button
                        type="button"
                        className="catalog-impact-toggle"
                        onClick={() => setExpandedPreviewId(previewExpanded ? null : service.id)}
                        aria-expanded={previewExpanded}
                        aria-controls={`impact-preview-${service.id}`}
                      >
                        Impact preview {previewExpanded ? '▾' : '▸'}
                      </button>
                      {previewExpanded && (
                        <div id={`impact-preview-${service.id}`} className="catalog-impact-preview">
                          <p><strong>System impact:</strong> {impact.system}</p>
                          <p><strong>Cost impact:</strong> {impact.cost}</p>
                          <p><strong>Integration effect:</strong> {impact.integration}</p>
                        </div>
                      )}
                      <Link href={serviceHref} className="service-card-link">
                        Open service details →
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
