import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ServiceDetailClient } from '@/components/ServiceDetailClient';
import { getApplicationById, getCatalogServiceById } from '@/components/data';

type ServiceDetailPageProps = {
  params: {
    id: string;
    serviceId: string;
  };
};

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const application = getApplicationById(params.id);
  const service = getCatalogServiceById(params.serviceId);

  if (!application || !service) {
    notFound();
  }

  const alternative = service.recommendedAlternativeServiceId
    ? getCatalogServiceById(service.recommendedAlternativeServiceId)
    : undefined;

  return (
    <AppShell>
      <ServiceDetailClient application={application} service={service} alternative={alternative} />
    </AppShell>
  );
}
