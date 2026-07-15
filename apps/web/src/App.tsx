import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './lib/auth';
import { Role } from './lib/roles';
import { DashboardPage } from './pages/DashboardPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LoginPage } from './pages/LoginPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { RegisterPage } from './pages/RegisterPage';
import { UsersPage } from './pages/UsersPage';
import { WeatherPage } from './pages/WeatherPage';
import './styles.css';

const queryClient = new QueryClient();

function HomeRedirect() {
  const { isAuthenticated, loading, homePath } = useAuth();
  if (loading) return <div className="page center">Loading session…</div>;
  return <Navigate to={isAuthenticated ? homePath : '/login'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute roles={[Role.ADMIN]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route element={<RoleRoute roles={[Role.ADMIN, Role.USER]} />}>
                <Route path="/weather" element={<WeatherPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
