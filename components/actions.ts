import { CloudApplication } from './types';

export const SHARED_ACTIONS = [
  'Roll back deployment',
  'Trigger deployment',
  'Switch environment',
  'Provision new environment',
  'Jump to logs & metrics',
  'Open AI companion',
  'Navigate to application',
] as const;

export type SharedActionLabel = (typeof SHARED_ACTIONS)[number];

export type SharedAction = {
  id: string;
  label: SharedActionLabel;
  description: string;
  requiresApplication: boolean;
  incidentPriority?: boolean;
};

const providerTone = (application?: CloudApplication) => {
  if (application?.provider === 'AWS') {
    return 'AWS workload context';
  }

  if (application?.provider === 'GCP') {
    return 'GCP workload context';
  }

  return 'select an application to set provider context';
};

export const buildSharedActions = (application?: CloudApplication): SharedAction[] => [
  {
    id: 'rollback',
    label: 'Roll back deployment',
    description: `Revert ${application?.name ?? 'the selected application'} to its previous stable version (${providerTone(application)}).`,
    requiresApplication: true,
    incidentPriority: true,
  },
  {
    id: 'trigger-deployment',
    label: 'Trigger deployment',
    description: `Start a new deployment for ${application?.name ?? 'the selected application'} using current release controls.`,
    requiresApplication: true,
  },
  {
    id: 'switch-environment',
    label: 'Switch environment',
    description: `Switch between dev, staging, and prod for ${application?.name ?? 'the selected application'}.`,
    requiresApplication: true,
  },
  {
    id: 'provision-environment',
    label: 'Provision new environment',
    description: `Provision a new environment using ${providerTone(application)} defaults.`,
    requiresApplication: true,
  },
  {
    id: 'jump-logs-metrics',
    label: 'Jump to logs & metrics',
    description: `Open operational telemetry for ${application?.name ?? 'the selected application'}.`,
    requiresApplication: true,
  },
  {
    id: 'open-ai-companion',
    label: 'Open AI companion',
    description: 'Open the AI companion drawer to investigate with guided recommendations.',
    requiresApplication: false,
  },
  {
    id: 'navigate-application',
    label: 'Navigate to application',
    description: 'Navigate across assigned applications and move workspace context quickly.',
    requiresApplication: false,
  },
];
