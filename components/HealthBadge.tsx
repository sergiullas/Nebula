import { Badge } from './Badge';
import { HealthStatus } from './types';

type HealthBadgeProps = {
  health: HealthStatus;
};

const healthLabel: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  warning: 'Degraded',
  critical: 'Critical',
};

export function HealthBadge({ health }: HealthBadgeProps) {
  const variant = health === 'healthy' ? 'healthy' : health === 'critical' ? 'critical' : 'degraded';
  return <Badge variant={variant}>{healthLabel[health]}</Badge>;
}
