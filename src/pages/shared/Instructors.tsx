// import { useState, useEffect } from 'react';
// import { usersApi } from '@/services/api';
// import { User } from '@/types';
// import { Spinner, Empty, PageTitle, Avatar } from '@/components/shared/index';

// export default function Instructors() {
//   const [tutors, setTutors] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   useEffect(() => { usersApi.listUsers({ role: 'tutor', per_page: 24 }).then(r => setTutors(r.data.items || [])).finally(() => setLoading(false)); }, []);
//   return (
//     <div className="fade-in">
//       <PageTitle title="Our Instructors" subtitle="Expert educators guiding your learning journey" crumbs={[{ label: 'Home', href: '/' }, { label: 'Instructors' }]} />
//       {loading ? <Spinner /> : tutors.length === 0 ? <Empty icon="bi-people" title="No instructors listed yet" subtitle="Our tutor team is growing — check back soon." /> : (
//         <div className="row g-4">
//           {tutors.map(t => (
//             <div className="col-sm-6 col-md-4 col-lg-3" key={t.id}>
//               <div className="card p-4 text-center h-100">
//                 <div className="mb-3"><Avatar image={t.image} name={t.name || t.username} size={88} /></div>
//                 <h6 className="fw-700 mb-0">{t.name || t.username}</h6>
//                 {t.title && <p className="text-primary fw-600 mb-1" style={{ fontSize: '0.8rem' }}>{t.title}</p>}
//                 {t.city && <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}><i className="bi bi-geo-alt me-1" />{t.city}</p>}
//                 {t.expertise && <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{t.expertise.slice(0, 80)}{t.expertise.length > 80 ? '…' : ''}</p>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
