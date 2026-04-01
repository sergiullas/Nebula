import rawApps from '@/data/apps.json';
import rawLogsMetrics from '@/data/logs-metrics.json';
import {
  AppLogsMetrics,
  CloudApplication,
  DependencyHealthStatus,
  HealthStatus,
  Provider,
  RollbackSimulation,
  ServiceCatalogItem,
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

const mockCatalogServices: ServiceCatalogItem[] = [
  {
    id: 'amazon-rds',
    name: 'Amazon RDS',
    provider: 'AWS',
    category: 'Database',
    description: 'Managed relational database service for transactional API workloads.',
    fitSignal: 'Recommended for this application',
    governance: 'Approved',
    cost: 'Moderate',
    trustSignal: 'Used in 3 ACME apps',
    detail: {
      bestFor: 'OLTP workloads and structured relational data.',
      avoidIf: 'You need schema-less ultra-high write throughput.',
      whyThisFits: 'Payments API serves transactional traffic with relational data patterns.',
      recommendationBasis: [
        'Based on current application pattern: API + relational data',
        'Based on existing provider context: AWS application',
        'Based on workload type: transactional workload rather than analytics warehouse',
      ],
      governanceExplanation: 'Approved for all environments with standard operational controls.',
      costEstimate: '$1,200 - $2,800 monthly for typical production usage.',
      impactNotes: ['Suitable for transactional workloads', 'Operational overhead stays moderate with managed backups'],
      configurationDefaults: { environment: 'prod', region: 'us-east-1', sizeTier: 'db.m6g.large' },
    },
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    provider: 'AWS',
    category: 'NoSQL Database',
    description: 'Serverless key-value and document database for low-latency access.',
    fitSignal: 'Alternative available',
    governance: 'Approved',
    cost: 'Moderate',
    detail: {
      bestFor: 'Event-driven systems and predictable key-based reads/writes.',
      avoidIf: 'Complex relational joins are core to business logic.',
      whyThisFits: 'Works for selective workloads but relational patterns remain dominant in this app.',
      recommendationBasis: ['Based on observed relational access pattern in Payments API'],
      governanceExplanation: 'Approved with standard tagging and backup policies.',
      costEstimate: '$900 - $2,200 monthly depending on throughput mode.',
      impactNotes: ['Alternative for specific bounded contexts', 'May increase data model complexity'],
      configurationDefaults: { environment: 'staging', region: 'us-east-1', sizeTier: 'Standard' },
    },
  },
  {
    id: 'elasticache',
    name: 'ElastiCache',
    provider: 'AWS',
    category: 'Caching',
    description: 'Managed in-memory cache for reducing read latency.',
    fitSignal: 'Useful for read-heavy traffic',
    governance: 'Requires approval',
    cost: 'Moderate',
    detail: {
      bestFor: 'Read-heavy endpoints and repeated object retrieval.',
      avoidIf: 'Data consistency requirements are strict and cache invalidation is immature.',
      whyThisFits: 'Can improve API response times for repeated payment reference lookups.',
      recommendationBasis: ['Based on current latency profile and repeated read patterns'],
      governanceExplanation: 'Requires architecture review before production rollout.',
      costEstimate: '$600 - $1,900 monthly by node count and memory class.',
      impactNotes: ['May require approval for production use', 'Adds cache invalidation complexity'],
      configurationDefaults: { environment: 'staging', region: 'us-east-1', sizeTier: 'cache.m6g.large' },
    },
  },
  {
    id: 'sqs',
    name: 'SQS',
    provider: 'AWS',
    category: 'Messaging',
    description: 'Durable queueing for asynchronous and decoupled processing.',
    fitSignal: 'Suitable for decoupled processing',
    governance: 'Approved',
    cost: 'Low',
    detail: {
      bestFor: 'Async workflows, retries, and smoothing request spikes.',
      avoidIf: 'You require strict synchronous request-response coupling.',
      whyThisFits: 'Supports payment event fan-out and retry handling in failure scenarios.',
      recommendationBasis: ['Based on resilience requirements for asynchronous processing'],
      governanceExplanation: 'Approved with default encryption and retention policies.',
      costEstimate: '$120 - $450 monthly for projected message volume.',
      impactNotes: ['Low cost option for reliability improvements', 'Improves decoupling between services'],
      configurationDefaults: { environment: 'prod', region: 'us-east-1', sizeTier: 'Standard queue' },
    },
  },
  {
    id: 'redshift',
    name: 'Redshift',
    provider: 'AWS',
    category: 'Analytics',
    description: 'Data warehouse optimized for large analytical queries.',
    fitSignal: 'Not recommended for this workload',
    governance: 'Discouraged',
    cost: 'High',
    recommendedAlternativeServiceId: 'amazon-rds',
    detail: {
      bestFor: 'Large-scale BI and analytical query workloads.',
      avoidIf: 'Primary need is transactional API storage.',
      whyThisFits: 'Current app needs operational transactions, not warehouse analytics.',
      recommendationBasis: ['Based on workload type mismatch: transactional API vs analytics warehouse'],
      governanceExplanation: 'Discouraged for this application due to cost and architectural mismatch.',
      costEstimate: '$3,500 - $9,000 monthly at minimum cluster footprint.',
      impactNotes: ['Higher ongoing cost than simpler alternatives', 'Will trigger governance review if overridden'],
      configurationDefaults: { environment: 'prod', region: 'us-east-1', sizeTier: 'ra3.xlplus' },
    },
  },
  {
    id: 'bigquery',
    name: 'BigQuery',
    provider: 'GCP',
    category: 'Analytics',
    description: 'Serverless enterprise data warehouse for analytical workloads.',
    fitSignal: 'Recommended for this application',
    governance: 'Approved',
    cost: 'Moderate',
    trustSignal: 'Used in 4 ACME apps',
    detail: {
      bestFor: 'Large-scale forecasting and analytical model pipelines.',
      avoidIf: 'Low-latency transactional CRUD is the primary workload.',
      whyThisFits: 'Forecast Engine depends on analytical aggregation and model reporting.',
      recommendationBasis: ['Based on current application pattern: analytics + model evaluation'],
      governanceExplanation: 'Approved with standard dataset-level governance controls.',
      costEstimate: '$1,400 - $3,100 monthly based on query volume.',
      impactNotes: ['Suitable for analytical workloads', 'Query-cost visibility required for broad usage'],
      configurationDefaults: { environment: 'prod', region: 'us-central1', sizeTier: 'Standard' },
    },
  },
  {
    id: 'cloud-storage',
    name: 'Cloud Storage',
    provider: 'GCP',
    category: 'Storage',
    description: 'Object storage for datasets, artifacts, and backup snapshots.',
    fitSignal: 'Suitable for model artifacts',
    governance: 'Approved',
    cost: 'Low',
    detail: {
      bestFor: 'Model artifacts, exports, and large object retention.',
      avoidIf: 'Frequent low-latency record updates are required.',
      whyThisFits: 'Forecast Engine needs durable storage for model outputs and training assets.',
      recommendationBasis: ['Based on artifact persistence and data lifecycle needs'],
      governanceExplanation: 'Approved with lifecycle and encryption policies.',
      costEstimate: '$150 - $480 monthly for typical artifact and dataset volume.',
      impactNotes: ['Low cost storage backbone', 'Lifecycle rules reduce long-term spend'],
      configurationDefaults: { environment: 'prod', region: 'us-central1', sizeTier: 'Standard' },
    },
  },
  {
    id: 'memorystore',
    name: 'Memorystore',
    provider: 'GCP',
    category: 'Caching',
    description: 'Managed Redis service for accelerating repeated read queries.',
    fitSignal: 'Useful for repeated query acceleration',
    governance: 'Requires approval',
    cost: 'Moderate',
    detail: {
      bestFor: 'Repeated query acceleration and short-lived intermediate results.',
      avoidIf: 'Cache invalidation strategy is undefined.',
      whyThisFits: 'Can improve response times for repeated forecast retrieval patterns.',
      recommendationBasis: ['Based on repeated query profile in forecast retrieval endpoints'],
      governanceExplanation: 'Requires approval for production due to memory cost controls.',
      costEstimate: '$700 - $1,850 monthly by memory tier.',
      impactNotes: ['May require approval for production use', 'Can reduce backend compute pressure'],
      configurationDefaults: { environment: 'staging', region: 'us-central1', sizeTier: 'redis-standard-2' },
    },
  },
  {
    id: 'cloud-sql',
    name: 'Cloud SQL',
    provider: 'GCP',
    category: 'Database',
    description: 'Managed relational database for operational and hybrid workloads.',
    fitSignal: 'Alternative available',
    governance: 'Approved',
    cost: 'Moderate',
    detail: {
      bestFor: 'Relational stores for control-plane and metadata workloads.',
      avoidIf: 'Primary requirement is large analytical querying at scale.',
      whyThisFits: 'Useful for metadata components, while BigQuery remains primary analytics store.',
      recommendationBasis: ['Based on mixed workload profile with metadata persistence needs'],
      governanceExplanation: 'Approved with baseline backup and security controls.',
      costEstimate: '$800 - $2,100 monthly depending on HA options.',
      impactNotes: ['Alternative for transactional side data', 'Moderate ongoing operational cost'],
      configurationDefaults: { environment: 'staging', region: 'us-central1', sizeTier: 'db-custom-2-7680' },
    },
  },
];

export const getCatalogServicesForProvider = (provider: Provider): ServiceCatalogItem[] =>
  mockCatalogServices.filter((service) => service.provider === provider);

export const getCatalogServiceById = (serviceId: string): ServiceCatalogItem | undefined =>
  mockCatalogServices.find((service) => service.id === serviceId);
