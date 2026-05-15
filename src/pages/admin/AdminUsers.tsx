// import { useState, useEffect } from 'react';
// import toast from 'react-hot-toast';
// import { usersApi } from '@/services/api';
// import { User } from '@/types';
// import { Spinner, PageTitle, Avatar, SearchInput } from '@/components/shared/index';

// export default function AdminUsers() {
//   const [users, setUsers] = useState<User[]>([]);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [roleFilter, setRoleFilter] = useState('');
//   const [page, setPage] = useState(1);
//   const load = () => { setLoading(true); usersApi.listUsers({ page, per_page: 20, search: search || undefined, role: roleFilter || undefined }).then(r => { setUsers(r.data.items || []); setTotal(r.data.total || 0); }).finally(() => setLoading(false)); };
//   useEffect(load, [page, search, roleFilter]);
//   const handleToggle = async (u: User) => { await usersApi.toggleActive(u.id); toast.success('User status updated'); load(); };
//   return (
//     <div className="fade-in">
//       <PageTitle title="Manage Users" subtitle={`${total} total users`} crumbs={[{ label: 'Admin' }, { label: 'Users' }]} />
      
//       {/* Filters */}
//       <div className="card mb-4">
//         <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
//           <div style={{ flex: '1 1 260px' }}>
//             <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search users" />
//           </div>
//           <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
//             <option value="">All Roles</option>
//             {['student','tutor','creator','partner','admin'].map(r => <option key={r} value={r}>{r}</option>)}
//           </select>
//           <span className="text-muted rounded-pill border px-3" style={{ fontSize: '0.8rem' }}>{total} user{total !== 1 ? 's' : ''}</span>
//         </div>
//       </div>

//       {loading ? <Spinner /> : (
//         <div className="card overflow-hidden">
//           <div className="table-responsive">
//             <table className="table mb-0">
//               <thead><tr><th>User</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr></thead>
//               <tbody>
//                 {users.map(u => (
//                   <tr key={u.id}>
//                     <td><div className="d-flex align-items-center gap-2"><Avatar image={u.image} name={u.name || u.username} size={36} /><div><div className="fw-600" style={{ fontSize: '0.875rem' }}>{u.name || u.username}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div></div></div></td>
//                     <td><div className="d-flex gap-1 flex-wrap">{u.roles.map(r => <span key={r} className="badge bg-primary-light text-primary" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{r}</span>)}</div></td>
//                     <td><span className={`badge ${u.active ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>{u.active ? 'Active' : 'Inactive'}</span>{' '}{u.email_verified && <span className="badge bg-info" style={{ fontSize: '0.65rem' }}>Verified</span>}</td>
//                     <td style={{ fontSize: '0.8rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
//                     <td><button className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => handleToggle(u)}><i className={`bi ${u.active ? 'bi-person-x' : 'bi-person-check'}`} /></button></td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// v2
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '@/services/api';
import { User } from '@/types';
import { Spinner, PageTitle, Avatar, SearchInput } from '@/components/shared/index';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const load = () => { setLoading(true); usersApi.listUsers({ page, per_page: 20, search: search || undefined, role: roleFilter || undefined }).then(r => { setUsers(r.data.items || []); setTotal(r.data.total || 0); }).finally(() => setLoading(false)); };
  useEffect(load, [page, search, roleFilter]);
  const handleToggle = async (u: User) => { await usersApi.toggleActive(u.id); toast.success('User status updated'); load(); };
  return (
    <div className="fade-in">
      <PageTitle title="Manage Users" subtitle={`${total} total users`} crumbs={[{ label: 'Admin' }, { label: 'Users' }]} />
      
      {/* Filters */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
          <div style={{ flex: '1 1 260px' }}>
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search users" />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {['student','tutor','creator','partner','admin'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-muted rounded-pill border px-3" style={{ fontSize: '0.8rem' }}>{total} user{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead><tr><th>User</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><div className="d-flex align-items-center gap-2"><Avatar image={u.image} name={u.name || u.username} size={36} /><div><div className="fw-600" style={{ fontSize: '0.875rem' }}>{u.name || u.username}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div></div></div></td>
                    <td><div className="d-flex gap-1 flex-wrap">{u.roles.map(r => <span key={r} className="badge bg-primary-light text-primary" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{r}</span>)}</div></td>
                    <td><span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>{u.is_active ? 'Active' : 'Inactive'}</span>{' '}{u.email_verified && <span className="badge bg-info" style={{ fontSize: '0.65rem' }}>Verified</span>}</td>
                    <td style={{ fontSize: '0.8rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td><button className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => handleToggle(u)}><i className={`bi ${u.is_active ? 'bi-person-x' : 'bi-person-check'}`} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
