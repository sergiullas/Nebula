import rawApps from '@/data/apps.json';
import rawLogsMetrics from '@/data/logs-metrics.json';
import {
  AppLogsMetrics,
  CloudApplication,
  DependencyHealthStatus,
  HealthStatus,
  Provider,
  RollbackSimulation,
  ServiceDependency,
} from './types';

const providers: Provider[] = ['AWS', 'GCP', 'Internal'];
const healthStatuses: HealthStatus[] = ['healthy', 'warning', 'critical'];
const dependencyHealthStatuses: DependencyHealthStatus[] = ['Healthy', 'Degraded', 'Critical', 'Unknown'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isProvider = (value: unknown): value is Provider =>
  typeof value === 'string' && providers.includes(value as Provider);

const isHealthStatus = (value: unknown): value is HealthStatus =>
  typeof value === 'string' && healthStatuses.includes(value as HealthStatus);

const isDependencyHealthStatus = (value: unknown): value is DependencyHealthStatus =>
  typeof value === 'string' && dependencyHealthStatuses.includes(value as DependencyHealthStatus);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isMetricsRecord = (value: unknown): value is RollbackSimulation['postRollbackMetrics'] => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.errorRate === 'string' &&
    typeof value.latencyP95 === 'string' &&
    typeof value.failedRequests === 'number' &&
    typeof value.deploymentVersion === 'string'
  );
};

const isDependencyRecord = (value: unknown): value is ServiceDependency => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    isProvider(value.provider) &&
    isDependencyHealthStatus(value.health) &&
    typeof value.metadata === 'string' &&
    (value.externalCaller === undefined || typeof value.externalCaller === 'boolean')
  );
};

const isRollbackSimulation = (value: unknown): value is RollbackSimulation => {
  if (!isObject(value)) {
    return false;
  }

  return (
    isMetricsRecord(value.postRollbackMetrics) &&
    isHealthStatus(value.postRollbackHealth) &&
    typeof value.aiConfirmation === 'string'
  );
};

const isCloudApplication = (value: unknown): value is CloudApplication => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.organization === 'string' &&
    typeof value.project === 'string' &&
    isProvider(value.provider) &&
    isStringArray(value.environments) &&
    isHealthStatus(value.health) &&
    typeof value.lastDeployment === 'string' &&
    typeof value.activeIncident === 'boolean' &&
    (value.aiSummary === undefined || typeof value.aiSummary === 'string') &&
    (value.recommendedAction === undefined || typeof value.recommendedAction === 'string')
  );
};

const isLogsMetricsRecord = (value: unknown): value is AppLogsMetrics => {
  if (!isObject(value) || !isMetricsRecord(value.metrics) || !isObject(value.aiInsights)) {
    return false;
  }

  return (
    typeof value.appId === 'string' &&
    isStringArray(value.logs) &&
    Array.isArray(value.dependencies) &&
    value.dependencies.every(isDependencyRecord) &&
    typeof value.aiInsights.summary === 'string' &&
    typeof value.aiInsights.likelyCause === 'string' &&
    typeof value.aiInsights.nextStep === 'string' &&
    (value.rollbackSimulation === undefined || isRollbackSimulation(value.rollbackSimulation))
  );
};

const parseApplications = (data: unknown): CloudApplication[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isCloudApplication);
};

const parseLogsMetrics = (data: unknown): AppLogsMetrics[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isLogsMetricsRecord);
};

export const mockApplications = parseApplications(rawApps);

const mockLogsMetrics = parseLogsMetrics(rawLogsMetrics);

export const getApplicationById = (id: string): CloudApplication | undefined =>
  mockApplications.find((app) => app.id === id);

export const getLogsMetricsByAppId = (id: string): AppLogsMetrics | undefined =>
  mockLogsMetrics.find((record) => record.appId === id);
