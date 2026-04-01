import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AppCatalogClient } from '@/components/AppCatalogClient';
import { getApplicationById, getCatalogServicesForProvider } from '@/components/data';

type AppCatalogPageProps = {
  params: {
    id: string;
  };
};

export default function AppCatalogPage({ params }: AppCatalogPageProps) {
  const application = getApplicationById(params.id);

  if (!application) {
    notFound();
  }

  const providerScopedServices = getCatalogServicesForProvider(application.provider);
  const allServices = [getCatalogServicesForProvider('AWS'), getCatalogServicesForProvider('GCP')].flat();

  return (
    <AppShell>
      <AppCatalogClient
        application={application}
        providerScopedServices={providerScopedServices}
        allServices={allServices}
      />
    </AppShell>
  );
}
