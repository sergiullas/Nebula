import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getApplicationById, getLogsMetricsByAppId } from '@/components/data';
import { ApplicationWorkspaceClient } from '@/components/ApplicationWorkspaceClient';

type ApplicationWorkspacePageProps = {
  params: {
    id: string;
  };
};

export default function ApplicationWorkspacePage({ params }: ApplicationWorkspacePageProps) {
  const application = getApplicationById(params.id);

  if (!application) {
    notFound();
  }

  const logsMetrics = getLogsMetricsByAppId(application.id);
  const currentEnvironment = application.environments.includes('prod') ? 'prod' : application.environments[0];

  return (
    <AppShell>
      <ApplicationWorkspaceClient
        application={application}
        logsMetrics={logsMetrics}
        currentEnvironment={currentEnvironment}
      />
    </AppShell>
  );
}
