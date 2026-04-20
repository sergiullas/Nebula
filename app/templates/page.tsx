import { AppShell } from '@/components/AppShell';
import { TemplatesClient } from '@/components/TemplatesClient';
import { getApplicationById, mockTemplates } from '@/components/data';

type TemplatesPageProps = {
  searchParams: {
    appId?: string;
    env?: string;
  };
};

export default function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const application = searchParams.appId ? getApplicationById(searchParams.appId) : undefined;
  const currentEnvironment = searchParams.env
    ?? (application?.environments.includes('prod') ? 'prod' : application?.environments[0]);

  return (
    <AppShell>
      <TemplatesClient
        templates={mockTemplates}
        application={application}
        currentEnvironment={currentEnvironment}
      />
    </AppShell>
  );
}
