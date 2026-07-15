import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Role } from '../lib/roles';

export function LoginPage() {
  const { login, isAuthenticated, loading, homePath } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [basicResult, setBasicResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === Role.ADMIN ? '/dashboard' : '/weather');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function testBasicAuth() {
    setError(null);
    setBasicResult(null);
    try {
      const response = await authApi.meBasic(email, password);
      setBasicResult(
        `Basic OK → ${response.data.user.email} (method: ${response.data.authMethod})`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Basic auth failed');
    }
  }

  return (
    <main className="page auth-page">
      <section className="panel">
        <p className="brand">Auth Lab</p>
        <h1>Sign in</h1>
        <p className="muted">JWT, Basic Auth, or Google OIDC.</p>

        <form className="stack" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {basicResult ? <p className="success">{basicResult}</p> : null}
          <div className="actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in (JWT)'}
            </button>
            <button type="button" className="ghost" onClick={() => void testBasicAuth()}>
              Test Basic Auth
            </button>
          </div>
        </form>

        <div className="divider">or</div>

        <a className="oauth google" href={authApi.googleAuthorizeUrl()}>
          Continue with Google
        </a>

        <p className="footer-link">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
