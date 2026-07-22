import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { navItemsForRole } from '../lib/roles';

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const items = user ? navItemsForRole(user.role) : [];

  return (
    <main className="page app-shell">
      <header className="app-chrome">
        <div className="app-chrome-brand">
          <p className="brand brand-mark">Auth Lab</p>
          <nav className="app-nav" aria-label="Main">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="app-chrome-actions">
          <span className="muted user-chip">
            {user?.username} · {user?.role}
          </span>
          <button type="button" className="ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero-band">
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </section>

      {children}
    </main>
  );
}
