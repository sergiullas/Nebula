'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CatalogService, CloudApplication, GovernanceStatus } from '@/components/types';
import { ProviderBadge } from '@/components/ProviderBadge';

type ServiceDetailClientProps = {
  application: CloudApplication;
  service: CatalogService;
  alternative?: CatalogService;
  currentEnvironment: string;
};

type ProvisionOutcome = 'idle' | 'confirming' | 'success' | 'pending-approval' | 'exception-submitted';

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

const ENVIRONMENTS = ['dev', 'staging', 'prod'];
const REGIONS_AWS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
const REGIONS_GCP = ['us-central1', 'europe-west1', 'asia-east1'];
const INSTANCE_SIZES = ['Small — db.t3.small', 'Medium — db.t3.medium', 'Large — db.t3.large'];

function fitDotClass(signal: string) {
  switch (signal) {
    case 'recommended': return 'fit-dot-recommended';
    case 'suitable': return 'fit-dot-suitable';
    case 'alternative': return 'fit-dot-alternative';
    case 'not-recommended': return 'fit-dot-not-recommended';
    default: return '';
  }
}

export function ServiceDetailClient({ application, service, alternative, currentEnvironment }: ServiceDetailClientProps) {
  const [environment, setEnvironment] = useState(currentEnvironment);
  const [region, setRegion] = useState(application.provider === 'GCP' ? REGIONS_GCP[0] : REGIONS_AWS[0]);
  const [instanceSize, setInstanceSize] = useState(INSTANCE_SIZES[1]);
  const [outcome, setOutcome] = useState<ProvisionOutcome>('idle');
  const [discouragedStep, setDiscouragedStep] = useState<'warning' | 'proceed'>('warning');

  const regions = application.provider === 'GCP' ? REGIONS_GCP : REGIONS_AWS;

  const handleProvisionClick = () => {
    setOutcome('confirming');
    if (service.governance === 'discouraged') {
      setDiscouragedStep('warning');
    }
  };

  const handleConfirm = () => {
    if (service.governance === 'approved') {
      setOutcome('success');
    } else if (service.governance === 'requires-approval') {
      setOutcome('pending-approval');
    }
  };

  const handleDiscouragedProceed = () => {
    setDiscouragedStep('proceed');
  };

  const handleExceptionSubmit = () => {
    setOutcome('exception-submitted');
  };

  const handleCancel = () => {
    setOutcome('idle');
  };

  return (
    <div className="detail-page">
      <div className="detail-nav-bar">
        <Link href={`/app/${application.id}/catalog`} className="catalog-back-link">
          ← Services for {application.name}
        </Link>
        <div className="pill-row">
          <ProviderBadge provider={application.provider} />
          <span className="pill env-pill">{application.name}</span>
          <span className="pill env-pill">{currentEnvironment}</span>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {/* Zone 1 — Decision Summary */}
          <div className="detail-summary-card">
            <div className="detail-summary-top">
              <div>
                <div className="detail-summary-name-row">
                  <h1 className="detail-service-name">{service.name}</h1>
                  <div className="pill-row">
                    <ProviderBadge provider={service.provider} />
                    <span className="pill env-pill">{service.category}</span>
                  </div>
                </div>
                <div className={`service-card-fit ${fitDotClass(service.fit.signal)}`} style={{ marginBottom: 6 }}>
                  <span className="fit-dot" />
                  <span>{service.fit.label}</span>
                </div>
                <p className="detail-summary-meta">
                  Governance: <span className={`pill ${governanceClass[service.governance]}`}>{governanceLabel[service.governance]}</span>
                  {' '}· Est. cost: {service.cost} · {service.costLabel}
                </p>
              </div>
            </div>
            {service.detail.usedInApps !== undefined && service.detail.usedInApps > 0 && (
              <p className="detail-used-in">Used in {service.detail.usedInApps} ACME application{service.detail.usedInApps !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Zone 2 — Why / When to Use */}
          <section className="detail-why-section">
            <p className="detail-section-label">WHY / WHEN TO USE</p>
            <div className="detail-why-grid">
              <div className="detail-why-block">
                <p className="detail-why-block-label">BEST FOR</p>
                <p className="detail-why-block-text">{service.detail.bestFor}</p>
              </div>
              <div className="detail-why-block">
                <p className="detail-why-block-label">AVOID IF</p>
                <p className="detail-why-block-text">{service.detail.avoidIf}</p>
              </div>
            </div>
            <div className="detail-why-block detail-why-app-context">
              <p className="detail-why-block-label">WHY THIS FITS YOUR APP</p>
              <p className="detail-why-block-text">{service.fit.appContext}</p>
            </div>
          </section>

          {/* Zone 3 — Configuration */}
          <section className="detail-config-section">
            <p className="detail-section-label">CONFIGURATION</p>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="env-select">Environment</label>
              <select
                id="env-select"
                className="detail-config-select"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="region-select">Region</label>
              <select
                id="region-select"
                className="detail-config-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="size-select">Instance size</label>
              <select
                id="size-select"
                className="detail-config-select"
                value={instanceSize}
                onChange={(e) => setInstanceSize(e.target.value)}
              >
                {INSTANCE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </section>
        </div>

        {/* Zone 4 — Governance / Cost / Action (right column) */}
        <aside className="detail-sidebar">
          <div className="detail-sidebar-block">
            <p className="detail-sidebar-label">GOVERNANCE</p>
            <span className={`pill ${governanceClass[service.governance]}`} style={{ display: 'inline-block', marginBottom: 8 }}>
              {governanceLabel[service.governance]}
            </span>
            <p className="detail-sidebar-text">{service.detail.governanceExplanation}</p>
          </div>

          <div className="detail-sidebar-block">
            <p className="detail-sidebar-label">IMPACT NOTES</p>
            {service.detail.impactNotes.map((note) => (
              <p key={note} className="detail-impact-note">{note}</p>
            ))}
          </div>

          <div className="detail-sidebar-block">
            <p className="detail-sidebar-label">ESTIMATED COST</p>
            <p className="detail-cost-tier">{service.cost}</p>
            <p className="detail-sidebar-text">{service.costEstimate}</p>
          </div>

          {/* Zone 5 — Action Layer */}
          {outcome === 'success' ? (
            <div className="provision-outcome provision-outcome-success">
              <p className="provision-outcome-title">Service provisioned</p>
              <p className="provision-outcome-body">{service.name} has been added to {application.name}.</p>
              <Link href={`/app/${application.id}`} className="incident-button" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
                Back to {application.name}
              </Link>
            </div>
          ) : outcome === 'pending-approval' ? (
            <div className="provision-outcome provision-outcome-pending">
              <p className="provision-outcome-title">Request submitted</p>
              <p className="provision-outcome-body">Provisioning request for {service.name} is pending platform team approval.</p>
              <Link href={`/app/${application.id}`} className="incident-button secondary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
                Back to {application.name}
              </Link>
            </div>
          ) : outcome === 'exception-submitted' ? (
            <div className="provision-outcome provision-outcome-exception">
              <p className="provision-outcome-title">Exception request recorded</p>
              <p className="provision-outcome-body">This request requires additional review. You will be notified when it is processed.</p>
              <Link href={`/app/${application.id}`} className="incident-button secondary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
                Back to {application.name}
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="provision-cta-button"
                onClick={handleProvisionClick}
              >
                Provision service
              </button>
              <p className="provision-cta-note">
                {service.governance === 'approved' && 'Pre-approved · Available within 15 minutes'}
                {service.governance === 'requires-approval' && 'Approval required · Platform team will review'}
                {service.governance === 'discouraged' && 'Discouraged · Will require exception review'}
              </p>
            </>
          )}
        </aside>
      </div>

      {/* Provision Modal */}
      {outcome === 'confirming' && (
        <section className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Provision service">
          <div className="confirm-modal provision-modal">
            {service.governance === 'approved' && (
              <>
                <h2 className="provision-modal-title">Provision {service.name}</h2>
                <p className="provision-modal-summary">
                  Add {service.name} in <strong>{environment}</strong> ({region}) to {application.name}.
                </p>
                <div className="provision-modal-meta">
                  <div><span className="provision-modal-key">Application</span><span>{application.name}</span></div>
                  <div><span className="provision-modal-key">Provider</span><span>{application.provider}</span></div>
                  <div><span className="provision-modal-key">Environment</span><span>{environment}</span></div>
                  <div><span className="provision-modal-key">Governance</span><span className={`pill ${governanceClass[service.governance]}`}>{governanceLabel[service.governance]}</span></div>
                  <div><span className="provision-modal-key">Actor</span><span>Devin</span></div>
                </div>
                <div className="confirm-actions">
                  <button type="button" className="incident-button" onClick={handleConfirm}>Confirm</button>
                  <button type="button" className="incident-button secondary" onClick={handleCancel}>Cancel</button>
                </div>
              </>
            )}

            {service.governance === 'requires-approval' && (
              <>
                <h2 className="provision-modal-title">Request approval for {service.name}</h2>
                <p className="provision-modal-summary">
                  Provisioning {service.name} requires platform team approval before it can be added to {application.name}.
                </p>
                <div className="provision-modal-meta">
                  <div><span className="provision-modal-key">Application</span><span>{application.name}</span></div>
                  <div><span className="provision-modal-key">Provider</span><span>{application.provider}</span></div>
                  <div><span className="provision-modal-key">Environment</span><span>{environment}</span></div>
                  <div><span className="provision-modal-key">Governance</span><span className={`pill ${governanceClass[service.governance]}`}>{governanceLabel[service.governance]}</span></div>
                  <div><span className="provision-modal-key">Actor</span><span>Devin</span></div>
                </div>
                <p className="provision-modal-note">Typical approval turnaround is 1–2 business days.</p>
                <div className="confirm-actions">
                  <button type="button" className="incident-button" onClick={handleConfirm}>Submit request</button>
                  <button type="button" className="incident-button secondary" onClick={handleCancel}>Cancel</button>
                </div>
              </>
            )}

            {service.governance === 'discouraged' && discouragedStep === 'warning' && (
              <>
                <div className="provision-modal-warning-banner">
                  <span className="provision-modal-warning-icon">⚠</span>
                  <span>This service is discouraged for this application type</span>
                </div>
                <h2 className="provision-modal-title">{service.name} is not recommended</h2>
                <p className="provision-modal-summary">
                  {service.name} is discouraged for {application.name}. {service.detail.impactNotes[0]}.
                </p>
                {alternative && (
                  <div className="provision-modal-alternative">
                    <p className="provision-modal-key">Recommended alternative</p>
                    <p>{alternative.name} — {alternative.fit.label}</p>
                  </div>
                )}
                <p className="provision-modal-note discouraged-note">
                  Proceeding will be logged and flagged for additional review. This action cannot be silently reversed.
                </p>
                <div className="confirm-actions">
                  {alternative && (
                    <Link
                      href={`/app/${application.id}/catalog/${alternative.id}`}
                      className="incident-button"
                      style={{ textDecoration: 'none' }}
                    >
                      Use {alternative.name} instead
                    </Link>
                  )}
                  <button type="button" className="incident-button secondary discouraged-proceed" onClick={handleDiscouragedProceed}>
                    Proceed anyway
                  </button>
                  <button type="button" className="incident-button secondary" onClick={handleCancel}>Cancel</button>
                </div>
              </>
            )}

            {service.governance === 'discouraged' && discouragedStep === 'proceed' && (
              <>
                <h2 className="provision-modal-title">Confirm exception request</h2>
                <p className="provision-modal-summary">
                  You are proceeding with a discouraged service. This action will be logged and require additional review before provisioning is completed.
                </p>
                <div className="provision-modal-meta">
                  <div><span className="provision-modal-key">Application</span><span>{application.name}</span></div>
                  <div><span className="provision-modal-key">Environment</span><span>{environment}</span></div>
                  <div><span className="provision-modal-key">Governance</span><span className={`pill ${governanceClass[service.governance]}`}>{governanceLabel[service.governance]}</span></div>
                  <div><span className="provision-modal-key">Actor</span><span>Devin</span></div>
                  <div><span className="provision-modal-key">Review required</span><span>Yes — exception flagged</span></div>
                </div>
                <div className="confirm-actions">
                  <button type="button" className="incident-button secondary discouraged-proceed" onClick={handleExceptionSubmit}>
                    Submit exception request
                  </button>
                  <button type="button" className="incident-button secondary" onClick={handleCancel}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
