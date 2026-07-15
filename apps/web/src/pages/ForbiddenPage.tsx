import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ForbiddenPage() {
  const { homePath } = useAuth();
  const location = useLocation();
  const from =
    location.state && typeof location.state === 'object' && 'from' in location.state
      ? String((location.state as { from?: string }).from)
      : undefined;

  return (
    <main className="page center">
      <section className="panel narrow">
        <p className="brand">Auth Lab</p>
        <h1>403 Forbidden</h1>
        <p className="muted">
          You do not have permission to access{from ? ` ${from}` : ' this page'}.
        </p>
        <p className="footer-link">
          <Link to={homePath}>Go to your home</Link>
        </p>
      </section>
    </main>
  );
}
