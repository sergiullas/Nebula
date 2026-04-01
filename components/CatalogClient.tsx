'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CatalogService, CloudApplication, GovernanceStatus, FitSignal } from '@/components/types';
import { ProviderBadge } from '@/components/ProviderBadge';

type CatalogClientProps = {
  application: CloudApplication;
  services: CatalogService[];
  currentEnvironment: string;
};

const ALL_CATEGORY = 'All';

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

export function CatalogClient({ application, services, currentEnvironment }: CatalogClientProps) {
  const categories = [ALL_CATEGORY, ...Array.from(new Set(services.map((s) => s.category)))];
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);

  const filtered = activeCategory === ALL_CATEGORY ? services : services.filter((s) => s.category === activeCategory);

  const quickLinks = services.slice(0, 3);

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
        </div>
        <div className="pill-row">
          <span className="pill provider-aws" style={application.provider === 'GCP' ? { background: '#e8eef9', color: '#355388' } : {}}>
            {application.provider}
          </span>
          <span className="pill env-pill">{currentEnvironment}</span>
        </div>
      </header>

      <div className="catalog-quick-bar">
        <span className="catalog-quick-label">Try a service:</span>
        {quickLinks.map((service) => (
          <Link
            key={service.id}
            href={`/app/${application.id}/catalog/${service.id}`}
            className={`catalog-quick-chip ${governanceClass[service.governance]}`}
          >
            {service.name} — {governanceLabel[service.governance]}
          </Link>
        ))}
      </div>

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

      <div className="catalog-grid">
        {filtered.map((service) => (
          <Link key={service.id} href={`/app/${application.id}/catalog/${service.id}`} className="service-card-link">
            <article className="service-card">
              <div className="service-card-top">
                <h2 className="service-card-name">{service.name}</h2>
                <ProviderBadge provider={service.provider} />
              </div>
              <p className="service-card-desc">{service.description}</p>
              <div className={`service-card-fit ${fitDotClass[service.fit.signal]}`}>
                <span className="fit-dot" />
                <span>{service.fit.label}</span>
              </div>
              <div className="service-card-footer">
                <span className={`pill ${governanceClass[service.governance]}`}>
                  {governanceLabel[service.governance]}
                </span>
                <span className="pill env-pill">{service.category}</span>
                <span className="pill env-pill cost-pill">{service.cost}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
