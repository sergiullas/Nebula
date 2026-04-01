import { AppLogsMetrics, CatalogService, CloudApplication } from '@/components/types';

export interface AIInsight {
  id: string;
  type: 'cost' | 'architecture' | 'reliability' | 'governance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  why: string;
  recommendation: string;
  actionLabel: string;
  actionType: 'navigate' | 'modal' | 'suggest';
  actionHref?: string;
  confidence: number;
  source: string;
  createdAt: string;
}

type InsightEngineInput = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  environment: string;
  catalogServices: CatalogService[];
};

export const MIN_CONFIDENCE = 0.75;

const TYPE_PRIORITY: Record<AIInsight['type'], number> = {
  governance: 0,
  reliability: 1,
  architecture: 2,
  cost: 3,
};

const normalize = (value: string) => value.toLowerCase();

const hasTransactionalDependency = (logsMetrics?: AppLogsMetrics) =>
  (logsMetrics?.dependencies ?? []).some((dependency) => /rds|postgresql|sql/i.test(`${dependency.name} ${dependency.metadata}`));

const hasUnhealthyDependency = (logsMetrics?: AppLogsMetrics) =>
  (logsMetrics?.dependencies ?? []).some((dependency) => dependency.health === 'Critical' || dependency.health === 'Degraded');

const findService = (
  services: CatalogService[],
  matcher: (service: CatalogService) => boolean,
): CatalogService | undefined => services.find(matcher);

const referencesAppContext = (service: CatalogService, application: CloudApplication) => {
  const context = normalize(service.fit.appContext);
  const appName = normalize(application.name);
  const appId = normalize(application.id).replace(/-/g, ' ');
  return context.includes(appName) || context.includes(appId);
};

const buildCandidates = ({ application, logsMetrics, environment, catalogServices }: InsightEngineInput): AIInsight[] => {
  const createdAt = new Date().toISOString();
  const candidates: AIInsight[] = [];

  if (hasUnhealthyDependency(logsMetrics)) {
    const criticalDependencies = (logsMetrics?.dependencies ?? [])
      .filter((dependency) => dependency.health === 'Critical' || dependency.health === 'Degraded')
      .map((dependency) => dependency.name)
      .join(', ');

    candidates.push({
      id: `${application.id}-reliability-dependencies`,
      type: 'reliability',
      severity: application.health === 'critical' ? 'high' : 'medium',
      title: 'Dependency health is affecting runtime resilience',
      description: `${application.name} has unstable dependencies in ${environment}, increasing error and latency risk.`,
      why: criticalDependencies || 'Dependency health telemetry indicates degraded upstream services.',
      recommendation: 'Review service dependencies and apply rollback or failover safeguards.',
      actionLabel: 'Highlight affected services',
      actionType: 'suggest',
      confidence: 0.91,
      source: 'operational-signals:dependency-health',
      createdAt,
    });
  }

  const discouragedService = findService(
    catalogServices,
    (service) => service.governance === 'discouraged' && service.fit.signal === 'not-recommended' && referencesAppContext(service, application),
  );

  if (discouragedService) {
    const approvedAlternative =
      discouragedService.alternativeId &&
      findService(catalogServices, (service) => service.id === discouragedService.alternativeId && service.governance === 'approved');

    candidates.push({
      id: `${application.id}-governance-${discouragedService.id}`,
      type: 'governance',
      severity: 'high',
      title: `${discouragedService.name} introduces governance exception risk`,
      description: `This service is discouraged for ${application.name} context and needs exception handling before adoption.`,
      why: `${discouragedService.fit.basis} ${discouragedService.detail.governanceExplanation}`,
      recommendation: approvedAlternative
        ? `Prefer ${approvedAlternative.name} for this workload to stay within approved guardrails.`
        : 'Use an approved catalog alternative before provisioning.',
      actionLabel: approvedAlternative ? `Open ${approvedAlternative.name}` : 'Review service details',
      actionType: 'navigate',
      actionHref: approvedAlternative
        ? `/app/${application.id}/catalog/${approvedAlternative.id}`
        : `/app/${application.id}/catalog/${discouragedService.id}`,
      confidence: 0.89,
      source: `catalog:${discouragedService.id}`,
      createdAt,
    });
  }

  const recommendedRelationalService = findService(
    catalogServices,
    (service) => service.fit.signal === 'recommended' && /relational|transactional|acid/i.test(service.fit.appContext),
  );

  if (hasTransactionalDependency(logsMetrics) && recommendedRelationalService && referencesAppContext(recommendedRelationalService, application)) {
    candidates.push({
      id: `${application.id}-architecture-relational-fit`,
      type: 'architecture',
      severity: 'medium',
      title: `${recommendedRelationalService.name} remains the best architecture fit`,
      description: 'Current workload patterns continue to favor relational and transactional guarantees.',
      why: `${recommendedRelationalService.fit.appContext} ${recommendedRelationalService.fit.basis}`,
      recommendation: 'Keep transactional paths on the recommended relational platform and validate HA settings.',
      actionLabel: `Review ${recommendedRelationalService.name}`,
      actionType: 'navigate',
      actionHref: `/app/${application.id}/catalog/${recommendedRelationalService.id}`,
      confidence: 0.81,
      source: `catalog:${recommendedRelationalService.id}`,
      createdAt,
    });
  }

  const costCandidate = findService(
    catalogServices,
    (service) => service.cost === '$$$' && service.fit.signal === 'not-recommended' && referencesAppContext(service, application),
  );

  if (costCandidate) {
    candidates.push({
      id: `${application.id}-cost-${costCandidate.id}`,
      type: 'cost',
      severity: 'medium',
      title: `Avoid high-cost mismatch with ${costCandidate.name}`,
      description: `Using ${costCandidate.name} here can materially increase spend without workload fit benefits.`,
      why: `${costCandidate.fit.basis} ${costCandidate.costEstimate}`,
      recommendation: 'Use the approved alternative to keep cost aligned with workload shape.',
      actionLabel: 'Review lower-cost option',
      actionType: 'navigate',
      actionHref: costCandidate.alternativeId ? `/app/${application.id}/catalog/${costCandidate.alternativeId}` : undefined,
      confidence: 0.78,
      source: `catalog:${costCandidate.id}`,
      createdAt,
    });
  }

  return candidates;
};

const isConsistent = (insight: AIInsight, catalogServices: CatalogService[]) => {
  if (!insight.why.trim()) {
    return false;
  }

  if (!insight.source.startsWith('catalog:')) {
    return true;
  }

  const serviceId = insight.source.replace('catalog:', '');
  const service = findService(catalogServices, (candidate) => candidate.id === serviceId);
  if (!service) {
    return false;
  }

  if (insight.type === 'governance') {
    return service.governance !== 'approved';
  }

  if (insight.type === 'architecture') {
    return service.fit.signal === 'recommended' || service.fit.signal === 'suitable';
  }

  if (insight.type === 'cost') {
    return service.cost === '$$$' || service.fit.signal === 'not-recommended';
  }

  return true;
};

export const generateApplicationInsights = (input: InsightEngineInput): AIInsight[] => {
  const rankedInsights = buildCandidates(input)
    .filter((insight) => insight.confidence >= MIN_CONFIDENCE)
    .filter((insight) => isConsistent(insight, input.catalogServices))
    .sort((left, right) => {
      const priorityDiff = TYPE_PRIORITY[left.type] - TYPE_PRIORITY[right.type];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.confidence - left.confidence;
    });

  const unique = rankedInsights.filter((insight, index, insights) => insights.findIndex((entry) => entry.id === insight.id) === index);
  return unique.slice(0, 3);
};
