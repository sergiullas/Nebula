export type Provider = 'AWS' | 'GCP';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type CloudApplication = {
  id: string;
  name: string;
  organization: string;
  project: string;
  provider: Provider;
  environments: string[];
  health: HealthStatus;
  lastDeployment: string;
  activeIncident: boolean;
  aiSummary?: string;
  recommendedAction?: string;
};

export type AppMetrics = {
  errorRate: string;
  latencyP95: string;
  failedRequests: number;
  deploymentVersion: string;
};

export type AppAiInsights = {
  summary: string;
  likelyCause: string;
  nextStep: string;
};

export type ActionStatus = 'idle' | 'running' | 'completed';

export type RollbackSimulation = {
  postRollbackMetrics: AppMetrics;
  postRollbackHealth: HealthStatus;
  aiConfirmation: string;
};

export type AppLogsMetrics = {
  appId: string;
  metrics: AppMetrics;
  logs: string[];
  aiInsights: AppAiInsights;
  rollbackSimulation?: RollbackSimulation;
};
