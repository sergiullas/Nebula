import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ServiceDetailClient } from '@/components/ServiceDetailClient';
import { getApplicationById, getCatalogServiceById } from '@/components/data';

type ServiceDetailPageProps = {
  params: { id: string; serviceId: string };
  searchParams: { env?: string };
};

export default function ServiceDetailPage({ params, searchParams }: ServiceDetailPageProps) {
  const application = getApplicationById(params.id);
  if (!application) {
    notFound();
  }

  const service = getCatalogServiceById(application.provider, params.serviceId);
  if (!service) {
    notFound();
  }

  const currentEnvironment = searchParams.env ?? application.environments[application.environments.length - 1];

  const alternative = service.alternativeId
    ? getCatalogServiceById(application.provider, service.alternativeId)
    : undefined;

  return (
    <AppShell>
      <ServiceDetailClient
        application={application}
        service={service}
        alternative={alternative}
        currentEnvironment={currentEnvironment}
      />
    </AppShell>
  );
}
