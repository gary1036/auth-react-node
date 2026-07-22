import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Role } from '../lib/roles';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { applyOAuthTokens } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing Google sign-in…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const error = params.get('error');
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (error) {
      setMessage(error);
      setFailed(true);
      return;
    }

    if (!accessToken || !refreshToken) {
      setMessage('Missing tokens from Google OAuth callback.');
      setFailed(true);
      return;
    }

    void (async () => {
      try {
        const user = await applyOAuthTokens(accessToken, refreshToken);
        navigate(user.role === Role.ADMIN ? '/dashboard' : '/weather', { replace: true });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Google sign-in failed');
        setFailed(true);
      }
    })();
  }, [params, applyOAuthTokens, navigate]);

  return (
    <main className="page center">
      <section className="panel narrow">
        <p className="brand brand-mark">Auth Lab</p>
        <h1>Google OIDC</h1>
        <p className={failed ? 'error' : 'muted'}>{message}</p>
        {failed ? (
          <p className="footer-link">
            <Link to="/login">Back to sign in</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
