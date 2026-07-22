import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../components/AppShell';
import { type User, usersApi } from '../lib/api';
import { Role, UserStatus } from '../lib/roles';

function avatarLabel(user: User) {
  return (user.name || user.username || user.email).slice(0, 1).toUpperCase();
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const listQuery = useQuery({
    queryKey: ['users', search, page],
    queryFn: async () => usersApi.list({ q: search || undefined, page, pageSize: 10 }),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      body: {
        name?: string | null;
        email?: string;
        username?: string;
        role?: Role;
      };
    }) => usersApi.update(input.id, input.body),
    onSuccess: async () => {
      setMessage('User updated successfully.');
      setError(null);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { id: string; status: UserStatus }) =>
      usersApi.updateStatus(input.id, input.status),
    onSuccess: async (_data, variables) => {
      setMessage(
        variables.status === UserStatus.ACTIVE
          ? 'User activated successfully.'
          : 'User deactivated successfully.',
      );
      setError(null);
      setStatusTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const meta = listQuery.data?.meta;
  const users = listQuery.data?.data ?? [];

  function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    updateMutation.mutate({
      id: editing.id,
      body: {
        name: String(form.get('name') || '') || null,
        email: String(form.get('email') || ''),
        username: String(form.get('username') || ''),
        role: String(form.get('role')) as Role,
      },
    });
  }

  return (
    <AppShell title="Users" subtitle="Search, edit, and activate or deactivate accounts.">
      <section className="panel stretch users-toolbar">
        <label>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="email, username, name…"
          />
        </label>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel stretch">
        {listQuery.isLoading ? <p className="muted">Loading users…</p> : null}
        {listQuery.isError ? (
          <p className="error">
            {listQuery.error instanceof Error ? listQuery.error.message : 'Failed to load users'}
          </p>
        ) : null}

        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="avatar" />
                      ) : (
                        <span className="avatar avatar-fallback">{avatarLabel(user)}</span>
                      )}
                      <div>
                        <strong>{user.username}</strong>
                        <div className="muted">{user.name ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge role-${user.role.toLowerCase()}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`badge status-${user.status.toLowerCase()}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="ghost" onClick={() => setEditing(user)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setStatusTarget(user)}
                      >
                        {user.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta ? (
          <div className="pagination">
            <button
              type="button"
              className="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="muted">
              Page {meta.page} / {meta.totalPages} · {meta.total} users
            </span>
            <button
              type="button"
              className="ghost"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-user-title">Edit user</h2>
            <form className="stack" onSubmit={onEditSubmit}>
              <label>
                Username
                <input name="username" defaultValue={editing.username} required />
              </label>
              <label>
                Full name
                <input name="name" defaultValue={editing.name ?? ''} />
              </label>
              <label>
                Email
                <input name="email" type="email" defaultValue={editing.email} required />
              </label>
              <label>
                Role
                <select name="role" defaultValue={editing.role}>
                  <option value={Role.USER}>USER</option>
                  <option value={Role.ADMIN}>ADMIN</option>
                </select>
              </label>
              <div className="actions">
                <button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {statusTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setStatusTarget(null)}>
          <div
            className="modal panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {statusTarget.status === UserStatus.ACTIVE ? 'Deactivate user?' : 'Activate user?'}
            </h2>
            <p className="muted">
              Confirm changing <strong>{statusTarget.username}</strong> to{' '}
              {statusTarget.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE}.
            </p>
            <div className="actions">
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    id: statusTarget.id,
                    status:
                      statusTarget.status === UserStatus.ACTIVE
                        ? UserStatus.INACTIVE
                        : UserStatus.ACTIVE,
                  })
                }
              >
                {statusMutation.isPending ? 'Updating…' : 'Confirm'}
              </button>
              <button type="button" className="ghost" onClick={() => setStatusTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
