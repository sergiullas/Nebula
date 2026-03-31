import Link from 'next/link';
import { CloudApplication } from './types';
import { ProviderBadge } from './ProviderBadge';
import { HealthBadge } from './HealthBadge';

type ApplicationCardProps = {
  app: CloudApplication;
};

export function ApplicationCard({ app }: ApplicationCardProps) {
  return (
    <Link className="app-card" href={`/app/${app.id}`}>
      <div className="meta">
        {app.organization} / {app.project}
      </div>
      <h2 className="app-name">{app.name}</h2>
      <div className="pill-row">
        <ProviderBadge provider={app.provider} />
        <HealthBadge health={app.health} />
        {app.activeIncident && <span className="pill incident-pill">Incident Active</span>}
      </div>
      <div className="meta">Last deployment: {app.lastDeployment}</div>
      {app.activeIncident && app.aiSummary && (
        <p className="ai-inline">
          <span>AI:</span> {app.aiSummary}
        </p>
      )}
    </Link>
  );
}
