import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { TemplateDetailClient } from '@/components/TemplateDetailClient';
import { getApplicationById, getTemplateById } from '@/components/data';

type TemplatePageProps = {
  params: { templateId: string };
  searchParams: {
    appId?: string;
    env?: string;
  };
};

export default function TemplatePage({ params, searchParams }: TemplatePageProps) {
  const template = getTemplateById(params.templateId);

  if (!template) {
    notFound();
  }

  const application = searchParams.appId ? getApplicationById(searchParams.appId) : undefined;

  return (
    <AppShell>
      <TemplateDetailClient
        template={template}
        application={application}
        currentEnvironment={searchParams.env}
      />
    </AppShell>
  );
}
