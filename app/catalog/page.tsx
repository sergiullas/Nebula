import { AppShell } from '@/components/AppShell';

export default function CatalogPage() {
  return (
    <AppShell currentPath="/catalog">
      <h1 className="page-title">Catalog</h1>
      <p className="placeholder">Use an application workspace Services tab to enter the app-scoped catalog.</p>
    </AppShell>
  );
}
