import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

const ROLE_COLOR = {
  admin:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)'    },
  seller:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)'   },
  customer: { color: '#8b9098', bg: 'rgba(139,144,152,0.08)', border: 'rgba(139,144,152,0.15)' },
};

const AVATAR_BG = {
  admin:    '#ef4444',
  seller:   '#3b82f6',
  customer: '#8b5cf6',
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi.getUsers().then((r) => r.data?.results || r.data || []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); toast.success('User updated'); },
    onError: (err) => toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Could not update user'),
  });

  const users = (data || []).filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>Manage platform accounts and roles</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#565a6a' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Name or email…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 pr-3 py-2 rounded-lg text-sm w-52" />
        </div>

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="input-dark py-2 rounded-lg text-sm" style={{ width: 150 }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="seller">Seller</option>
          <option value="customer">Customer</option>
        </select>

        {!isLoading && (
          <span className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #2d3139' }}>
            {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && users.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(28,31,38,0.65)', border: '1px dashed #2d3139' }}>
          <p className="text-sm font-medium" style={{ color: '#565a6a' }}>No users found</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && users.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
              <tr>
                {[
                  { label: 'User',   cls: '' },
                  { label: 'Email',  cls: 'hidden md:table-cell' },
                  { label: 'Role',   cls: '' },
                  { label: 'Status', cls: 'hidden sm:table-cell' },
                  { label: 'Joined', cls: 'hidden lg:table-cell' },
                  { label: '',       cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${h.cls}`}
                    style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const rc = ROLE_COLOR[user.role] || ROLE_COLOR.customer;
                const av = AVATAR_BG[user.role] || AVATAR_BG.customer;
                return (
                  <tr key={user.id} className="hover:bg-[#22252e] transition-colors" style={{ borderTop: '1px solid #2d3139' }}>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: av }}>
                          {user.first_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-sm" style={{ color: '#f1f2f4' }}>
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 hidden md:table-cell font-mono text-xs" style={{ color: '#8b9098' }}>
                      {user.email}
                    </td>

                    <td className="px-5 py-3.5">
                      <select
                        className="input-dark py-1.5 text-xs rounded-lg capitalize"
                        style={{ width: 120 }}
                        value={user.role}
                        onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                      >
                        <option value="customer">Customer</option>
                        <option value="seller">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border`}
                        style={user.is_active
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                          : { background: 'rgba(239,68,68,0.1)',  color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)'  }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: user.is_active ? '#10b981' : '#ef4444' }} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs tabular-nums" style={{ color: '#8b9098' }}>
                      {new Date(user.date_joined || user.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        style={user.is_active
                          ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                          : { background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
