import { CloudApplication } from './types';
import { ACTION_LABELS } from './execution';

export const SHARED_ACTIONS = [
  ACTION_LABELS.rollbackDeployment,
  ACTION_LABELS.triggerDeployment,
  ACTION_LABELS.switchEnvironment,
  ACTION_LABELS.provisionEnvironment,
  ACTION_LABELS.jumpToLogsMetrics,
  ACTION_LABELS.openAiCompanion,
  ACTION_LABELS.navigateApplication,
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
  if (application?.provider === 'AWS') return 'AWS workload context';
  if (application?.provider === 'GCP') return 'GCP workload context';
  return 'select an application to set provider context';
};

export const buildSharedActions = (application?: CloudApplication): SharedAction[] => [
  {
    id: 'rollback',
    label: ACTION_LABELS.rollbackDeployment,
    description: `Revert ${application?.name ?? 'the selected application'} to its previous stable version (${providerTone(application)}).`,
    requiresApplication: true,
    incidentPriority: true,
  },
  {
    id: 'trigger-deployment',
    label: ACTION_LABELS.triggerDeployment,
    description: `Start a new deployment for ${application?.name ?? 'the selected application'} using current release controls.`,
    requiresApplication: true,
  },
  {
    id: 'switch-environment',
    label: ACTION_LABELS.switchEnvironment,
    description: `Switch between dev, staging, and prod for ${application?.name ?? 'the selected application'}.`,
    requiresApplication: true,
  },
  {
    id: 'provision-environment',
    label: ACTION_LABELS.provisionEnvironment,
    description: `Provision a new environment using ${providerTone(application)} defaults.`,
    requiresApplication: true,
  },
  {
    id: 'jump-logs-metrics',
    label: ACTION_LABELS.jumpToLogsMetrics,
    description: `Open operational telemetry for ${application?.name ?? 'the selected application'}.`,
    requiresApplication: true,
  },
  {
    id: 'open-ai-companion',
    label: ACTION_LABELS.openAiCompanion,
    description: 'Open the AI companion drawer to investigate with guided recommendations.',
    requiresApplication: false,
  },
  {
    id: 'navigate-application',
    label: ACTION_LABELS.navigateApplication,
    description: 'Navigate across assigned applications and move workspace context quickly.',
    requiresApplication: false,
  },
];
