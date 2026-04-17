'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CatalogService, CloudApplication, GovernanceStatus } from '@/components/types';
import { ProviderBadge } from '@/components/ProviderBadge';
import { ACTION_LABELS, useActionExecution } from '@/components/execution';

type ServiceDetailClientProps = {
  application: CloudApplication;
  service: CatalogService;
  alternative?: CatalogService;
  currentEnvironment: string;
};

type ProvisionOutcome = 'idle' | 'success' | 'pending-approval' | 'exception-submitted' | 'failed';

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
  const { requestAction } = useActionExecution();
  const [environment, setEnvironment] = useState(currentEnvironment);
  const [region, setRegion] = useState(application.provider === 'GCP' ? REGIONS_GCP[0] : REGIONS_AWS[0]);
  const [instanceSize, setInstanceSize] = useState(INSTANCE_SIZES[1]);
  const [outcome, setOutcome] = useState<ProvisionOutcome>('idle');
  const [outcomeMessage, setOutcomeMessage] = useState('');

  const regions = application.provider === 'GCP' ? REGIONS_GCP : REGIONS_AWS;

  const handleProvisionClick = () => {
    const governanceSignal = service.governance === 'discouraged'
      ? `Discouraged for this app type.${alternative ? ` Consider ${alternative.name}.` : ''}`
      : governanceLabel[service.governance];

    requestAction({
      actionType: ACTION_LABELS.provisionService,
      source: 'service',
      target: `${application.name} · ${service.name}`,
      appId: application.id,
      provider: application.provider,
      environment,
      governanceState: service.governance,
      impactSummary: `Provision ${service.name} to ${application.name} in ${environment} (${region}, ${instanceSize}).`,
      governanceSignal,
      confirmLabel: 'Confirm provision service',
      onExecute: () => {
        if (service.governance === 'approved') {
          return { status: 'success', message: `Provision service succeeded for ${service.name}.` };
        }
        if (service.governance === 'requires-approval') {
          return { status: 'success', message: `Provision service request submitted for ${service.name}.`, details: 'Pending approval.' };
        }
        return { status: 'success', message: `Exception request submitted for ${service.name}.`, details: 'Discouraged service flagged for review.' };
      },
      onComplete: (result) => {
        setOutcomeMessage(result.message);
        if (service.governance === 'approved' && result.status === 'success') {
          setOutcome('success');
          return;
        }
        if (service.governance === 'requires-approval' && result.status === 'success') {
          setOutcome('pending-approval');
          return;
        }
        if (service.governance === 'discouraged' && result.status === 'success') {
          setOutcome('exception-submitted');
          return;
        }
        setOutcome('failed');
      },
    });
  };

  return (
    <div className="detail-page">
      <div className="detail-nav-bar">
        <Link href={`/app/${application.id}/catalog`} className="catalog-back-link">← Services for {application.name}</Link>
        <div className="pill-row">
          <ProviderBadge provider={application.provider} />
          <span className="pill env-pill">{application.name}</span>
          <span className="pill env-pill">{currentEnvironment}</span>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
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
          </div>

          <section className="detail-config-section">
            <p className="detail-section-label">CONFIGURATION</p>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="env-select">Environment</label>
              <select id="env-select" className="detail-config-select" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
              </select>
            </div>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="region-select">Region</label>
              <select id="region-select" className="detail-config-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="detail-config-field">
              <label className="detail-config-label" htmlFor="size-select">Instance size</label>
              <select id="size-select" className="detail-config-select" value={instanceSize} onChange={(e) => setInstanceSize(e.target.value)}>
                {INSTANCE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </section>
        </div>

        <aside className="detail-sidebar">
          <div className="detail-sidebar-block">
            <p className="detail-sidebar-label">GOVERNANCE</p>
            <span className={`pill ${governanceClass[service.governance]}`} style={{ display: 'inline-block', marginBottom: 8 }}>{governanceLabel[service.governance]}</span>
            <p className="detail-sidebar-text">{service.detail.governanceExplanation}</p>
          </div>

          {outcome === 'success' ? (
            <div className="provision-outcome provision-outcome-success">
              <p className="provision-outcome-title">Service provisioned</p>
              <p className="provision-outcome-body">{outcomeMessage || `${service.name} has been added to ${application.name}.`}</p>
              <Link href={`/app/${application.id}`} className="incident-button" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
                Back to {application.name}
              </Link>
            </div>
          ) : outcome === 'pending-approval' ? (
            <div className="provision-outcome provision-outcome-pending">
              <p className="provision-outcome-title">Request submitted</p>
              <p className="provision-outcome-body">{outcomeMessage || `Provisioning request for ${service.name} is pending platform team approval.`}</p>
            </div>
          ) : outcome === 'exception-submitted' ? (
            <div className="provision-outcome provision-outcome-exception">
              <p className="provision-outcome-title">Exception request recorded</p>
              <p className="provision-outcome-body">{outcomeMessage || 'This request requires additional review.'}</p>
            </div>
          ) : outcome === 'failed' ? (
            <div className="provision-outcome provision-outcome-exception">
              <p className="provision-outcome-title">Provisioning failed</p>
              <p className="provision-outcome-body">{outcomeMessage || 'The request could not be completed.'}</p>
            </div>
          ) : (
            <>
              <button type="button" className="provision-cta-button" onClick={handleProvisionClick}>Provision service</button>
              <p className="provision-cta-note">
                {service.governance === 'approved' && 'Pre-approved · Available within 15 minutes'}
                {service.governance === 'requires-approval' && 'Approval required · Platform team will review'}
                {service.governance === 'discouraged' && 'Discouraged · Will require exception review'}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
