import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { dashboardApi } from '../lib/api';
import { useAuth } from '../lib/auth';

export function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardApi.stats();
      return response.data;
    },
  });

  const stats = statsQuery.data;

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome${user?.name ? `, ${user.name}` : ''}. System overview for admins.`}
    >
      {statsQuery.isLoading ? (
        <section className="panel stretch">
          <p className="muted">Loading stats…</p>
        </section>
      ) : null}

      {statsQuery.isError ? (
        <section className="panel stretch">
          <p className="error">
            {statsQuery.error instanceof Error ? statsQuery.error.message : 'Failed to load stats'}
          </p>
        </section>
      ) : null}

      {stats ? (
        <section className="stats-grid">
          <article className="panel stat-card">
            <p className="muted">Total users</p>
            <p className="stat-value">{stats.totalUsers}</p>
          </article>
          <article className="panel stat-card">
            <p className="muted">Active</p>
            <p className="stat-value">{stats.activeUsers}</p>
          </article>
          <article className="panel stat-card">
            <p className="muted">Inactive</p>
            <p className="stat-value">{stats.inactiveUsers}</p>
          </article>
          <article className="panel stat-card">
            <p className="muted">Admins</p>
            <p className="stat-value">{stats.adminUsers}</p>
          </article>
          <article className="panel stat-card">
            <p className="muted">Users</p>
            <p className="stat-value">{stats.regularUsers}</p>
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}
