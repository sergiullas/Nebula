'use client';

import { useMemo } from 'react';
import { getCatalogServicesByProvider } from '@/components/data';
import { AppLogsMetrics, CloudApplication } from '@/components/types';
import { AIInsight, buildApplicationInsights } from '@/components/insightEngine';

const buildReferenceTimestamp = (application: CloudApplication, currentEnvironment: string, logsMetrics?: AppLogsMetrics) =>
  `${application.id}:${currentEnvironment}:${application.lastDeployment}:${logsMetrics?.metrics.deploymentVersion ?? 'no-deployment'}`;

type UseApplicationInsightsInput = {
  application: CloudApplication;
  currentEnvironment: string;
  logsMetrics?: AppLogsMetrics;
};

export const useApplicationInsights = ({
  application,
  currentEnvironment,
  logsMetrics,
}: UseApplicationInsightsInput): AIInsight[] => {
  return useMemo(() => {
    const catalogServices = getCatalogServicesByProvider(application.provider);

    return buildApplicationInsights({
      application,
      environment: currentEnvironment,
      logsMetrics,
      catalogServices,
      referenceTimestamp: buildReferenceTimestamp(application, currentEnvironment, logsMetrics),
    });
  }, [application, currentEnvironment, logsMetrics]);
};
