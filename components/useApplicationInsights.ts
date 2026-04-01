import { useMemo } from 'react';
import { ApplicationInsight } from '@/components/ApplicationInsights';
import { getCatalogServicesByProvider } from '@/components/data';
import { generateApplicationInsights } from '@/components/insightEngine';
import { AppLogsMetrics, CloudApplication } from '@/components/types';

type UseApplicationInsightsInput = {
  application: CloudApplication;
  logsMetrics?: AppLogsMetrics;
  currentEnvironment: string;
};

export const useApplicationInsights = ({
  application,
  logsMetrics,
  currentEnvironment,
}: UseApplicationInsightsInput): ApplicationInsight[] => {
  return useMemo(() => {
    const catalogServices = getCatalogServicesByProvider(application.provider);

    return generateApplicationInsights({
      application,
      logsMetrics,
      environment: currentEnvironment,
      catalogServices,
    }).map((insight) => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      why: insight.why,
      actionLabel: insight.actionLabel,
      actionType: insight.actionType,
      actionHref: insight.actionHref,
      severity: insight.severity,
      confidence: insight.confidence,
      source: insight.source,
    }));
  }, [application, logsMetrics, currentEnvironment]);
};
