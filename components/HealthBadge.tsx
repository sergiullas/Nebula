import { HealthStatus } from './types';

type HealthBadgeProps = {
  health: HealthStatus;
};

const healthLabel: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  warning: 'Degraded',
  critical: 'Critical'
};

export function HealthBadge({ health }: HealthBadgeProps) {
  return <span className={`pill health-${health}`}>{healthLabel[health]}</span>;
}
