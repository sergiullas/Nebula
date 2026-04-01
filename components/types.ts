export type Provider = 'AWS' | 'GCP' | 'Internal';

export type HealthStatus = 'healthy' | 'warning' | 'critical';
export type DependencyHealthStatus = 'Healthy' | 'Degraded' | 'Critical' | 'Unknown';

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

export type ServiceDependency = {
  name: string;
  provider: Provider;
  health: DependencyHealthStatus;
  metadata: string;
  externalCaller?: boolean;
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
  dependencies: ServiceDependency[];
};

export type ActionAuditEntry = {
  action: string;
  application: string;
  environment: string;
  actor: string;
  timestamp: string;
};

export type GovernanceStatus = 'approved' | 'requires-approval' | 'discouraged';
export type FitSignal = 'recommended' | 'suitable' | 'alternative' | 'not-recommended';
export type CostTier = '$' | '$$' | '$$$';

export type CatalogServiceFit = {
  signal: FitSignal;
  label: string;
  appContext: string;
  basis: string;
};

export type CatalogServiceDetail = {
  bestFor: string;
  avoidIf: string;
  governanceExplanation: string;
  impactNotes: string[];
  usedInApps?: number;
};

export type CatalogService = {
  id: string;
  name: string;
  provider: Provider;
  category: string;
  description: string;
  fit: CatalogServiceFit;
  governance: GovernanceStatus;
  cost: CostTier;
  costLabel: string;
  costEstimate: string;
  detail: CatalogServiceDetail;
  alternativeId?: string;
};
