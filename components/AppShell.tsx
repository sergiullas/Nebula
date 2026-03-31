import Link from 'next/link';
import { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
  currentPath?: string;
};

const navItems = [
  { href: '/', label: 'My Applications' },
  { href: '/catalog', label: 'Catalog' },
];

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">Cloud Brokerage Portal</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              className={`nav-link ${currentPath === item.href ? 'active' : ''}`}
              key={item.href}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="screen-shell">
        <main className="screen-content">{children}</main>
      </div>
    </div>
  );
}
