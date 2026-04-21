import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { CatalogClient } from '@/components/CatalogClient';
import { getApplicationById, getCatalogServicesByProvider, mockTemplates } from '@/components/data';

type CatalogPageProps = {
  params: { id: string };
  searchParams: { env?: string };
};

export default function CatalogPage({ params, searchParams }: CatalogPageProps) {
  const application = getApplicationById(params.id);
  if (!application) {
    notFound();
  }

  const currentEnvironment = searchParams.env ?? application.environments[application.environments.length - 1];
  const services = getCatalogServicesByProvider(application.provider);
  const templateAlternatives = mockTemplates.filter((template) => template.provider === application.provider);

  return (
    <AppShell>
      <CatalogClient
        application={application}
        services={services}
        currentEnvironment={currentEnvironment}
        templateAlternatives={templateAlternatives}
      />
    </AppShell>
  );
}
