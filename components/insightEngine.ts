import { AppLogsMetrics, CatalogService, CloudApplication, GovernanceStatus } from '@/components/types';

export const MIN_CONFIDENCE = 0.75;

export type AIInsightType = 'cost' | 'architecture' | 'reliability' | 'governance';
export type AIInsightSeverity = 'low' | 'medium' | 'high';
export type AIInsightActionType = 'navigate' | 'modal' | 'suggest';

export type AIInsight = {
  id: string;
  type: AIInsightType;
  severity: AIInsightSeverity;
  title: string;
  description: string;
  why: string;
  recommendation: string;
  actionLabel: string;
  actionType: AIInsightActionType;
  actionHref?: string;
  confidence: number;
  source: string;
  createdAt: string;
};

type BuildInsightsInput = {
  application: CloudApplication;
  environment: string;
  logsMetrics?: AppLogsMetrics;
  catalogServices: CatalogService[];
  referenceTimestamp: string;
};

const typePriority: Record<AIInsightType, number> = {
  governance: 0,
  reliability: 1,
  architecture: 2,
  cost: 3,
};

const governancePriority: Record<GovernanceStatus, number> = {
  discouraged: 0,
  'requires-approval': 1,
  approved: 2,
};

const hasExplanation = (insight: AIInsight) => insight.why.trim().length > 0;

const hasAction = (insight: AIInsight) => {
  if (!insight.actionLabel.trim()) {
    return false;
  }

  return insight.actionType !== 'navigate' || Boolean(insight.actionHref);
};

const normalize = (value: string) => value.toLowerCase();

const dependencyMatchesService = (metadata: string, service: CatalogService) => {
  const normalizedMetadata = normalize(metadata);
  const normalizedName = normalize(service.name);
  const providerMatch = normalize(service.provider);

  if (normalizedMetadata.includes(normalizedName)) {
    return true;
  }

  if (service.id === 'amazon-rds' && /rds|postgres|mysql/.test(normalizedMetadata)) {
    return true;
  }

  if (service.id === 'bigquery' && normalizedMetadata.includes('bigquery')) {
    return true;
  }

  return normalizedMetadata.includes(providerMatch) && normalizedMetadata.includes(service.category.toLowerCase());
};

const sortInsights = (insights: AIInsight[]) =>
  insights
    .sort((a, b) => {
      const priorityDelta = typePriority[a.type] - typePriority[b.type];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return b.confidence - a.confidence;
    })
    .slice(0, 3);

const sourceServiceId = (source: string) => {
  const [scope, serviceId] = source.split(':');
  if (scope !== 'catalog' || !serviceId) {
    return undefined;
  }

  return serviceId;
};


const findServiceNameById = (catalogServices: CatalogService[], serviceId?: string) => {
  if (!serviceId) {
    return undefined;
  }

  return catalogServices.find((service) => service.id === serviceId)?.name;
};

const isConsistentWithCatalog = (insight: AIInsight, catalogServices: CatalogService[]) => {
  if (insight.type !== 'governance' && insight.type !== 'architecture') {
    return true;
  }

  const relatedServiceId = sourceServiceId(insight.source);
  if (!relatedServiceId) {
    return false;
  }

  const related = catalogServices.find((service) => service.id === relatedServiceId);
  if (!related) {
    return false;
  }

  if (insight.type === 'governance') {
    return related.governance !== 'approved';
  }

  return related.fit.signal === 'not-recommended' || related.fit.signal === 'alternative';
};

export const buildApplicationInsights = ({
  application,
  environment,
  logsMetrics,
  catalogServices,
  referenceTimestamp,
}: BuildInsightsInput): AIInsight[] => {
  const insights: AIInsight[] = [];
  const createdAt = referenceTimestamp;
  const dependencies = logsMetrics?.dependencies ?? [];
  const metrics = logsMetrics?.metrics;

  const presentCatalogServices = catalogServices
    .map((service) => ({ service, isPresent: dependencies.some((dep) => dependencyMatchesService(dep.metadata, service)) }))
    .filter((entry) => entry.isPresent)
    .map((entry) => entry.service)
    .sort((a, b) => governancePriority[a.governance] - governancePriority[b.governance]);

  const highestGovernanceRisk = presentCatalogServices.find(
    (service) => service.governance === 'discouraged' || service.governance === 'requires-approval',
  );

  if (highestGovernanceRisk) {
    insights.push({
      id: `governance-${highestGovernanceRisk.id}`,
      type: 'governance',
      severity: highestGovernanceRisk.governance === 'discouraged' ? 'high' : 'medium',
      title:
        highestGovernanceRisk.governance === 'discouraged'
          ? `${highestGovernanceRisk.name} requires exception review`
          : `${highestGovernanceRisk.name} needs governance approval`,
      description: highestGovernanceRisk.detail.governanceExplanation,
      why: `Based on policy: ${highestGovernanceRisk.fit.appContext}`,
      recommendation:
        highestGovernanceRisk.alternativeId !== undefined
          ? `View ${findServiceNameById(catalogServices, highestGovernanceRisk.alternativeId) ?? 'the approved alternative'} before provisioning.`
          : `Open governance guidance before provisioning ${highestGovernanceRisk.name}.`,
      actionLabel:
        highestGovernanceRisk.alternativeId !== undefined ? 'View approved alternative' : 'Open governance guidance',
      actionType: 'navigate',
      actionHref: `/app/${application.id}/catalog/${highestGovernanceRisk.alternativeId ?? highestGovernanceRisk.id}`,
      confidence: highestGovernanceRisk.governance === 'discouraged' ? 0.95 : 0.83,
      source: `catalog:${highestGovernanceRisk.id}:governance`,
      createdAt,
    });
  }

  const unhealthyDependencies = dependencies.filter((dep) => dep.health === 'Critical' || dep.health === 'Degraded');
  const hasTransactionalDatabase = dependencies.some((dep) => /rds|postgres|mysql/i.test(dep.metadata));

  if (!application.activeIncident && environment === 'prod' && unhealthyDependencies.length > 0) {
    insights.push({
      id: 'reliability-unhealthy-dependencies',
      type: 'reliability',
      severity: unhealthyDependencies.some((dep) => dep.health === 'Critical') ? 'high' : 'medium',
      title: 'Production dependencies need reliability attention',
      description: `${unhealthyDependencies.map((dep) => dep.name).join(', ')} currently report unhealthy states.`,
      why: `Based on operational trend: dependency health checks in ${environment} show ${unhealthyDependencies.length} unhealthy services.`,
      recommendation: 'Open affected dependencies and prioritize mitigation before the next deployment.',
      actionLabel: 'Open affected dependencies',
      actionType: 'suggest',
      confidence: unhealthyDependencies.some((dep) => dep.health === 'Critical') ? 0.9 : 0.8,
      source: 'ops:dependency-health',
      createdAt,
    });
  }

  if (application.activeIncident && environment === 'prod' && hasTransactionalDatabase) {
    const databaseService = presentCatalogServices.find((service) => service.category === 'Database');

    insights.push({
      id: 'reliability-resilience-ha-gap',
      type: 'reliability',
      severity: 'high',
      title: 'Production database is not configured for high availability',
      description: 'Current production database posture should be validated for multi-zone failover readiness.',
      why: 'Based on deployment configuration: single-AZ database in production increases outage risk.',
      recommendation: 'Open database configuration and confirm high-availability settings before the next release.',
      actionLabel: 'Open database configuration',
      actionType: 'navigate',
      actionHref: `/app/${application.id}/catalog/${databaseService?.id ?? 'amazon-rds'}`,
      confidence: 0.85,
      source: 'ops:resilience-pattern',
      createdAt,
    });
  }

  const notRecommendedService = presentCatalogServices.find((service) => service.fit.signal === 'not-recommended');
  if (notRecommendedService) {
    insights.push({
      id: `architecture-${notRecommendedService.id}`,
      type: 'architecture',
      severity: 'medium',
      title: `${notRecommendedService.name} is a weak architecture fit`,
      description: notRecommendedService.fit.basis,
      why: `Based on workload pattern: ${notRecommendedService.fit.appContext}`,
      recommendation:
        notRecommendedService.alternativeId !== undefined
          ? `Switch to ${findServiceNameById(catalogServices, notRecommendedService.alternativeId) ?? 'the approved alternative'} for this workload pattern.`
          : `Reassess the selected service for this application pattern.`,
      actionLabel: 'Open service fit rationale',
      actionType: 'navigate',
      actionHref: `/app/${application.id}/catalog/${notRecommendedService.id}`,
      confidence: 0.88,
      source: `catalog:${notRecommendedService.id}:fit`,
      createdAt,
    });
  }

  const recommendedService = catalogServices.find((service) => service.fit.signal === 'recommended');
  const isOverProvisioned = Boolean(metrics && metrics.failedRequests < 20 && Number.parseFloat(metrics.errorRate) < 1);
  if (recommendedService && isOverProvisioned) {
    insights.push({
      id: `cost-${recommendedService.id}`,
      type: 'cost',
      severity: 'medium',
      title: 'Current baseline suggests over-provisioned spend',
      description: `Low failure volume and low error rate indicate room to optimize ${recommendedService.name} capacity.`,
      why: `Based on operational trend: ${metrics?.failedRequests ?? 0} failed requests and ${metrics?.errorRate ?? '0%'} error rate.`,
      recommendation: 'Model a smaller capacity profile and compare cost estimate before applying changes.',
      actionLabel: 'Open sizing recommendation',
      actionType: 'modal',
      confidence: 0.78,
      source: `ops:usage-pattern:${recommendedService.id}`,
      createdAt,
    });
  }

  return sortInsights(
    insights.filter(
      (insight) =>
        insight.confidence >= MIN_CONFIDENCE &&
        hasExplanation(insight) &&
        hasAction(insight) &&
        isConsistentWithCatalog(insight, catalogServices),
    ),
  );
};
