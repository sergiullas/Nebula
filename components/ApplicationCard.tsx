import Link from 'next/link';
import { CloudApplication } from './types';
import { Badge } from './Badge';

type ApplicationCardProps = {
  app: CloudApplication;
};

export function ApplicationCard({ app }: ApplicationCardProps) {
  const providerVariant = app.provider === 'AWS' ? 'aws' : app.provider === 'GCP' ? 'gcp' : 'unknown';
  const healthVariant = app.health === 'healthy' ? 'healthy' : app.health === 'critical' ? 'critical' : 'degraded';

  return (
    <Link className="app-card" href={`/app/${app.id}`}>
      <div className="app-card__breadcrumb">
        {app.organization} / {app.project}
      </div>
      <h2 className="app-card__name">{app.name}</h2>
      <div className="app-card__badges">
        <Badge variant={providerVariant}>{app.provider}</Badge>
        <Badge variant={healthVariant}>{app.health === 'warning' ? 'Degraded' : app.health === 'healthy' ? 'Healthy' : 'Critical'}</Badge>
        {app.activeIncident && <Badge variant="incident">Incident Active</Badge>}
      </div>
      <div className="app-card__deployment">Last deployment: {app.lastDeployment}</div>
      {app.activeIncident && app.aiSummary && (
        <p className="app-card__insight">
          <span className="app-card__insight-prefix">AI:</span> {app.aiSummary}
        </p>
      )}
    </Link>
  );
}
