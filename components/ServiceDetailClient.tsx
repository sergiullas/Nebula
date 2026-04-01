'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudApplication, ServiceCatalogItem } from '@/components/types';
import { ProvisionConfirmationModal } from '@/components/ProvisionConfirmationModal';

type ServiceDetailClientProps = {
  application: CloudApplication;
  service: ServiceCatalogItem;
  alternative?: ServiceCatalogItem;
};

type ProvisionOutcome = 'success' | 'pending' | 'recorded' | null;

export function ServiceDetailClient({ application, service, alternative }: ServiceDetailClientProps) {
  const router = useRouter();
  const [environment, setEnvironment] = useState(service.detail.configurationDefaults.environment);
  const [region, setRegion] = useState(service.detail.configurationDefaults.region);
  const [sizeTier, setSizeTier] = useState(service.detail.configurationDefaults.sizeTier);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outcome, setOutcome] = useState<ProvisionOutcome>(null);

  return (
    <section className="service-detail-layout">
      <header className="service-summary">
        <p className="catalog-kicker">Services for {application.name}</p>
        <div className="catalog-card-head">
          <h1 className="workspace-title">{service.name}</h1>
          <span className={`pill ${service.provider === 'AWS' ? 'provider-aws' : 'provider-gcp'}`}>{service.provider}</span>
        </div>
        <div className="pill-row">
          <span className="pill">{service.category}</span>
          <span className="pill">Fit: {service.fitSignal}</span>
          <span
            className={`pill ${
              service.governance === 'Approved'
                ? 'gov-approved'
                : service.governance === 'Requires approval'
                  ? 'gov-requires'
                  : 'gov-discouraged'
            }`}
          >
            {service.governance}
          </span>
          <span className="pill">Cost: {service.cost}</span>
          {service.trustSignal && <span className="pill">{service.trustSignal}</span>}
        </div>
      </header>

      <section className="decision-why-grid">
        <article className="section-card">
          <h2 className="section-title">Best for</h2>
          <p className="placeholder">{service.detail.bestFor}</p>
        </article>
        <article className="section-card">
          <h2 className="section-title">Avoid if</h2>
          <p className="placeholder">{service.detail.avoidIf}</p>
        </article>
        <article className="section-card">
          <h2 className="section-title">Why this fits your app</h2>
          <p className="placeholder">{service.detail.whyThisFits}</p>
        </article>
        <article className="section-card">
          <h2 className="section-title">Recommendation basis</h2>
          {service.detail.recommendationBasis.map((basis) => (
            <p className="placeholder" key={basis}>
              • {basis}
            </p>
          ))}
        </article>
      </section>

      <section className="detail-columns">
        <article className="section-card">
          <h2 className="section-title">Configuration</h2>
          <label className="form-label" htmlFor="environment">
            Environment
          </label>
          <select
            id="environment"
            className="form-input"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as 'dev' | 'staging' | 'prod')}
          >
            <option value="dev">dev</option>
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>

          <label className="form-label" htmlFor="region">
            Region
          </label>
          <input id="region" className="form-input" value={region} onChange={(e) => setRegion(e.target.value)} />

          <label className="form-label" htmlFor="sizeTier">
            Size tier
          </label>
          <input id="sizeTier" className="form-input" value={sizeTier} onChange={(e) => setSizeTier(e.target.value)} />
        </article>

        <article className="section-card">
          <h2 className="section-title">Risk / policy / impact</h2>
          <p className="placeholder">
            <strong>Governance:</strong> {service.detail.governanceExplanation}
          </p>
          <p className="placeholder">
            <strong>Cost estimate:</strong> {service.detail.costEstimate}
          </p>
          {service.detail.impactNotes.map((note) => (
            <p key={note} className="placeholder">
              • {note}
            </p>
          ))}
        </article>
      </section>

      {outcome && (
        <article className="outcome-panel">
          {outcome === 'success' && (
            <>
              <p className="section-title">Service provisioned successfully</p>
              <p>{service.name} has been added to {application.name}.</p>
            </>
          )}
          {outcome === 'pending' && (
            <>
              <p className="section-title">Request submitted</p>
              <p>Provisioning request is pending approval.</p>
            </>
          )}
          {outcome === 'recorded' && (
            <>
              <p className="section-title">Proceed request recorded</p>
              <p>This request will require additional review.</p>
            </>
          )}
        </article>
      )}

      <div className="action-layer">
        <button type="button" className="incident-button" onClick={() => setIsModalOpen(true)}>
          Provision service
        </button>
        <Link href={`/app/${application.id}/catalog`} className="incident-button secondary inline-action-link">
          Back to catalog
        </Link>
      </div>

      {isModalOpen && (
        <ProvisionConfirmationModal
          service={service}
          applicationName={application.name}
          appProvider={application.provider}
          environment={environment}
          alternativeName={alternative?.name}
          onClose={() => setIsModalOpen(false)}
          onConfirmApproved={() => {
            setOutcome('success');
            setIsModalOpen(false);
          }}
          onSubmitApproval={() => {
            setOutcome('pending');
            setIsModalOpen(false);
          }}
          onUseAlternative={() => {
            if (alternative) {
              router.push(`/app/${application.id}/catalog/${alternative.id}`);
              return;
            }

            setIsModalOpen(false);
          }}
          onProceedDiscouraged={() => {
            setOutcome('recorded');
            setIsModalOpen(false);
          }}
        />
      )}
    </section>
  );
}
