import { CloudApplication } from './types';
import { EXECUTION_ACTION_LABELS } from './execution';

export const SHARED_ACTIONS = [
  EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT,
  EXECUTION_ACTION_LABELS.RESTART_SERVICE,
  'Navigate to application',
  'Open AI companion',
  'Jump to logs & metrics',
] as const;

export type SharedActionLabel = (typeof SHARED_ACTIONS)[number];

export type SharedAction = {
  id: string;
  label: SharedActionLabel;
  description: string;
  requiresApplication: boolean;
  incidentPriority?: boolean;
  category: 'execution' | 'navigation';
};

const providerTone = (application?: CloudApplication) => {
  if (application?.provider === 'AWS') return 'AWS workload context';
  if (application?.provider === 'GCP') return 'GCP workload context';
  return 'select an application to set provider context';
};

export const buildSharedActions = (application?: CloudApplication): SharedAction[] => [
  {
    id: 'rollback',
    label: EXECUTION_ACTION_LABELS.ROLLBACK_DEPLOYMENT,
    description: `Revert ${application?.name ?? 'the selected application'} to its previous stable version (${providerTone(application)}).`,
    requiresApplication: true,
    incidentPriority: true,
    category: 'execution',
  },
  {
    id: 'restart-service',
    label: EXECUTION_ACTION_LABELS.RESTART_SERVICE,
    description: `Restart core workloads for ${application?.name ?? 'the selected application'} and restore service health checks.`,
    requiresApplication: true,
    category: 'execution',
  },
  {
    id: 'jump-logs-metrics',
    label: 'Jump to logs & metrics',
    description: `Open operational telemetry for ${application?.name ?? 'the selected application'}.`,
    requiresApplication: true,
    category: 'navigation',
  },
  {
    id: 'open-ai-companion',
    label: 'Open AI companion',
    description: 'Open the AI companion drawer to investigate with guided recommendations.',
    requiresApplication: false,
    category: 'navigation',
  },
  {
    id: 'navigate-application',
    label: 'Navigate to application',
    description: 'Navigate across assigned applications and move workspace context quickly.',
    requiresApplication: false,
    category: 'navigation',
  },
];
