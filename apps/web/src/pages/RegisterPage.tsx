import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Role } from '../lib/roles';

export function RegisterPage() {
  const { register, isAuthenticated, loading, homePath } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register(email, password, name || undefined);
      navigate(user.role === Role.ADMIN ? '/dashboard' : '/weather');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page auth-page">
      <section className="panel">
        <p className="brand brand-mark">Auth Lab</p>
        <h1>Create account</h1>
        <p className="muted">Local registration returns JWT access and refresh tokens.</p>

        <form className="stack" onSubmit={onSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Register'}
          </button>
        </form>

        <p className="footer-link">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
