import { AppShell } from '@/components/AppShell';

export default function CatalogPage() {
  return (
    <AppShell currentPath="/catalog">
      <h1 className="page-title">Catalog</h1>
      <p className="catalog-decision-title">Choose how to build your application.</p>
      <p className="catalog-decision-subtitle">Start with a template or add services.</p>
      <p className="placeholder">Catalog experience will be added in later phases.</p>
    </AppShell>
  );
}
