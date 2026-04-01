'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CloudApplication, ServiceCatalogItem } from '@/components/types';

type AppCatalogClientProps = {
  application: CloudApplication;
  providerScopedServices: ServiceCatalogItem[];
  allServices: ServiceCatalogItem[];
};

export function AppCatalogClient({ application, providerScopedServices, allServices }: AppCatalogClientProps) {
  const [showAllProviders, setShowAllProviders] = useState(false);

  const visibleServices = useMemo(
    () => (showAllProviders ? allServices : providerScopedServices),
    [allServices, providerScopedServices, showAllProviders],
  );

  return (
    <section className="catalog-layout">
      <header className="catalog-header">
        <div>
          <p className="catalog-kicker">Application Workspace · Services</p>
          <h1 className="workspace-title">Services for {application.name}</h1>
          <p className="catalog-subcontext">
            {application.provider} application context · Showing services narrowed for this app by default
          </p>
        </div>
        <button type="button" className="incident-button secondary" onClick={() => setShowAllProviders((current) => !current)}>
          {showAllProviders ? `Show ${application.provider} only` : 'Show all providers'}
        </button>
      </header>

      <p className="catalog-scope-chip">
        Current app: <strong>{application.name}</strong> · Provider scope:{' '}
        <strong>{showAllProviders ? 'All providers (secondary view)' : application.provider}</strong>
      </p>

      <div className="catalog-card-grid">
        {visibleServices.map((service) => (
          <article key={service.id} className="catalog-card">
            <div className="catalog-card-head">
              <h2 className="catalog-service-name">{service.name}</h2>
              <span className={`pill ${service.provider === 'AWS' ? 'provider-aws' : 'provider-gcp'}`}>{service.provider}</span>
            </div>
            <p className="catalog-category">{service.category}</p>
            <p className="catalog-fit">
              <span className="fit-dot" /> {service.fitSignal}{' '}
              <Link href={`/app/${application.id}/catalog/${service.id}`} className="inline-link">
                Why?
              </Link>
            </p>
            <div className="pill-row">
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
            </div>
            <p className="catalog-description">{service.description}</p>
            <Link href={`/app/${application.id}/catalog/${service.id}`} className="catalog-detail-link">
              Review service
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
