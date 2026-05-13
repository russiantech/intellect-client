// import { useState, useEffect, useRef } from 'react';
// import { useParams } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { usersApi, creatorApi, authApi } from '@/services/api';
// import { User } from '@/types';
// import { Spinner, PageTitle, Avatar, Modal, resolveImage } from '@/components/shared/index';
// import { useAuth } from '@/context/AuthContext';

// export default function Profile() {
//   const { username } = useParams<{ username?: string }>();
//   const { user: me, updateUser } = useAuth();
//   const isOwnProfile = !username || username === me?.username;

//   const [profile, setProfile] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [editing, setEditing] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [showPwModal, setShowPwModal] = useState(false);
//   const [showCreatorModal, setShowCreatorModal] = useState(false);
//   const [uploadingAvatar, setUploadingAvatar] = useState(false);
//   const fileRef = useRef<HTMLInputElement>(null);

//   const [form, setForm] = useState({
//     name: '', title: '', gender: '', city: '', country: '', lang: 'en',
//     about: '', phone: '', education: '', expertise: '', creator_bio: '',
//     bank_name: '', bank_account_number: '', bank_account_name: '',
//     socials: { linkedin: '', twitter: '', whatsapp: '', website: '' },
//   });

//   const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
//   const [creatorForm, setCreatorForm] = useState({ motivation: '', portfolio_url: '' });

//   useEffect(() => {
//     const load = async () => {
//       try {
//         if (isOwnProfile) {
//           const r = await usersApi.getProfile();
//           setProfile(r.data);
//           populateForm(r.data);
//         } else {
//           const r = await usersApi.getPublicProfile(username!);
//           setProfile(r.data);
//         }
//       } catch { toast.error('Could not load profile'); }
//       finally { setLoading(false); }
//     };
//     load();
//   }, [username]);

//   const populateForm = (u: User) => {
//     setForm({
//       name: u.name || '', title: u.title || '', gender: u.gender || '',
//       city: u.city || '', country: u.country || '', lang: u.lang || 'en',
//       about: u.about || '', phone: u.phone || '',
//       education: u.education || '', expertise: u.expertise || '',
//       creator_bio: u.creator_bio || '',
//       bank_name: u.bank_name || '', bank_account_number: u.bank_account_number || '',
//       bank_account_name: u.bank_account_name || '',
//       socials: { linkedin: u.socials?.linkedin || '', twitter: u.socials?.twitter || '', whatsapp: u.socials?.whatsapp || '', website: u.socials?.website || '' },
//     });
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       const payload = { ...form, socials: form.socials };
//       const r = await usersApi.updateProfile(payload);
//       setProfile(r.data);
//       updateUser(r.data);
//       setEditing(false);
//       toast.success('Profile updated!');
//     } catch (err: any) { toast.error(err.response?.data?.detail || 'Update failed'); }
//     finally { setSaving(false); }
//   };

//   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setUploadingAvatar(true);
//     try {
//       const r = await usersApi.uploadAvatar(file);
//       setProfile(prev => prev ? { ...prev, image: r.data.image } : prev);
//       updateUser({ image: r.data.image });
//       toast.success('Photo updated!');
//     } catch { toast.error('Upload failed'); }
//     finally { setUploadingAvatar(false); }
//   };

//   const handleChangePassword = async () => {
//     if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match');
//     if (pwForm.new_password.length < 4) return toast.error('Password must be at least 4 characters');
//     try {
//       await authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
//       toast.success('Password changed!');
//       setShowPwModal(false);
//       setPwForm({ current_password: '', new_password: '', confirm: '' });
//     } catch (err: any) { toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to change password'); }
//   };

//   const handleCreatorRequest = async () => {
//     try {
//       await creatorApi.requestRole({ requested_role: 'creator', ...creatorForm });
//       toast.success('Request submitted! We\'ll notify you once reviewed.');
//       setShowCreatorModal(false);
//     } catch (err: any) { toast.error(err.response?.data?.detail || 'Request failed'); }
//   };

//   if (loading) return <Spinner />;
//   if (!profile) return <div className="text-center py-5 text-muted">Profile not found</div>;

//   const avatarSrc = resolveImage(
//     profile.image,
//     `https://ui-avatars.com/api/?name=${encodeURIComponent(
//       profile.name || profile.username
//     )}&size=200&background=4A90D9&color=fff`
//   );

//   return (
//     <div className="fade-in">
//       <PageTitle title={isOwnProfile ? 'My Profile' : profile.name || profile.username}
//         crumbs={[{ label: 'Home', href: '/' }, { label: isOwnProfile ? 'My Profile' : 'Profile' }]} />

//       <div className="row g-4">
//         {/* Left — avatar + quick info */}
//         <div className="col-lg-4">
//           <div className="card p-4 text-center mb-3">
//             <div className="position-relative d-inline-block mx-auto mb-3">

//               <img src={avatarSrc} alt={profile.name || profile.username}
//                 style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary-light)' }} />

//               {/* <Avatar image={profile.image} name={profile.name || profile.username} size={120}  /> */}
              
//               {isOwnProfile && (
//                 <>
//                   <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}
//                     style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                     {uploadingAvatar ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-camera" />}
//                   </button>
//                   <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
//                 </>
//               )}
//             </div>

//             <h5 className="fw-bold mb-0">{profile.name || profile.username}</h5>
//             <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>@{profile.username}</p>
//             {profile.title && <p className="text-primary fw-600 mb-2" style={{ fontSize: '0.85rem' }}>{profile.title}</p>}

//             <div className="d-flex justify-content-center gap-2 flex-wrap mb-3">
//               {profile.roles.map(r => (
//                 <span key={r} className="badge bg-primary-light text-primary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{r}</span>
//               ))}
//               {profile.email_verified && <span className="badge bg-success" style={{ fontSize: '0.7rem' }}><i className="bi bi-patch-check me-1" />Verified</span>}
//             </div>

//             {profile.city && <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}><i className="bi bi-geo-alt me-1" />{profile.city}{profile.country ? `, ${profile.country}` : ''}</p>}
//             {profile.created_at && <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Joined {new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>}

//             {/* Socials */}
//             {profile.socials && (
//               <div className="d-flex justify-content-center gap-2 mt-3">
//                 {profile.socials.linkedin && <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><i className="bi bi-linkedin" /></a>}
//                 {profile.socials.twitter && <a href={`https://twitter.com/${profile.socials.twitter}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><i className="bi bi-twitter-x" /></a>}
//                 {profile.socials.website && <a href={profile.socials.website} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><i className="bi bi-globe" /></a>}
//                 {profile.socials.whatsapp && <a href={`https://wa.me/${profile.socials.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary"><i className="bi bi-whatsapp" /></a>}
//               </div>
//             )}

//             {isOwnProfile && (
//               <div className="mt-3 d-flex flex-wrap gap-1 align-items-center">
//                 <button
//                   className="btn btn-primary btn-icon-start btn-sm"
//                   onClick={() => setEditing(true)}
//                 >
//                   <i className="bi bi-pencil" /> Edit Profile
//                 </button>

//                 <button
//                   className="btn btn-outline-secondary btn-icon-start btn-sm"
//                   onClick={() => setShowPwModal(true)}
//                 >
//                   <i className="bi bi-lock" /> Change Password
//                 </button>

//                 {/* {!profile.is_creator || !profile.roles?.includes('creator') && (
//                   <button
//                     className="btn btn-outline-primary btn-icon-start btn-sm"
//                     onClick={() => setShowCreatorModal(true)}
//                   >
//                     <i className="bi bi-pencil-square" /> Become a Creator
//                   </button>
//                 )} */}

//                 {!profile.roles?.includes('creator') && (
//                   <button
//                     className="btn btn-outline-primary btn-icon-start btn-sm"
//                     onClick={() => setShowCreatorModal(true)}
//                   >
//                     <i className="bi bi-pencil-square" /> Become a Creator
//                   </button>
//                 )}
                
//               </div>
//             )}

//           </div>
//         </div>

//         {/* Right — details */}
//         <div className="col-lg-8">
//           {editing ? (
//             <div className="card p-4">
//               <div className="d-flex align-items-center justify-content-between mb-4">
//                 <h5 className="fw-bold mb-0">Edit Profile</h5>
//                 <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditing(false); populateForm(profile); }}>Cancel</button>
//               </div>
//               <div className="row g-3">
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Full Name</label>
//                   <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Title / Role</label>
//                   <input className="form-control" placeholder="e.g. Software Engineer" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Phone</label>
//                   <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Gender</label>
//                   <select className="form-select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
//                     <option value="">Prefer not to say</option>
//                     <option>Male</option><option>Female</option><option>Other</option>
//                   </select>
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>City</label>
//                   <input className="form-control" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Country</label>
//                   <input className="form-control" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
//                 </div>
//                 <div className="col-12">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>About</label>
//                   <textarea className="form-control" rows={3} placeholder="Tell us about yourself…" value={form.about} onChange={e => setForm(p => ({ ...p, about: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Education</label>
//                   <input className="form-control" placeholder="Bsc. Artificial Intelligence" value={form.education} onChange={e => setForm(p => ({ ...p, education: e.target.value }))} />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Expertise / Skills</label>
//                   <input className="form-control" placeholder="e.g. Python, Data Science" value={form.expertise} onChange={e => setForm(p => ({ ...p, expertise: e.target.value }))} />
//                 </div>
//                 {profile.is_creator && (
//                   <div className="col-12">
//                     <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Creator Bio</label>
//                     <textarea className="form-control" placeholder="Tell us about your journey as a creator…" rows={2} value={form.creator_bio} onChange={e => setForm(p => ({ ...p, creator_bio: e.target.value }))} />
//                   </div>
//                 )}
//                 <div className="col-12"><h6 className="fw-700 mt-1 mb-2">Social Links</h6></div>
//                 {(['linkedin', 'twitter', 'whatsapp', 'website'] as const).map(s => (
//                   <div className="col-sm-6" key={s}>
//                     <label className="form-label fw-600" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{s}</label>
//                     <div className="position-relative">
//                       <i className={`bi bi-${s === 'website' ? 'globe' : s === 'whatsapp' ? 'whatsapp' : s === 'twitter' ? 'twitter-x' : 'linkedin'} position-absolute`} style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
//                       <input className="form-control" style={{ paddingLeft: '2.5rem' }} value={form.socials[s]} onChange={e => setForm(p => ({ ...p, socials: { ...p.socials, [s]: e.target.value } }))} />
//                     </div>
//                   </div>
//                 ))}
//                 {profile.is_creator && (
//                   <>
//                     <div className="col-12"><h6 className="fw-700 mt-1 mb-2">Banking Details (for payouts)</h6></div>
//                     <div className="col-sm-4">
//                       <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Bank Name</label>
//                       <input className="form-control" value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} />
//                     </div>
//                     <div className="col-sm-4">
//                       <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Account Number</label>
//                       <input className="form-control" value={form.bank_account_number} onChange={e => setForm(p => ({ ...p, bank_account_number: e.target.value }))} />
//                     </div>
//                     <div className="col-sm-4">
//                       <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Account Name</label>
//                       <input className="form-control" value={form.bank_account_name} onChange={e => setForm(p => ({ ...p, bank_account_name: e.target.value }))} />
//                     </div>
//                   </>
//                 )}
//               </div>
//               <div className="d-flex justify-content-end gap-2 mt-4">
//                 <button className="btn btn-outline-secondary" onClick={() => { setEditing(false); populateForm(profile); }}>Cancel</button>
//                 <button className="btn btn-primary fw-600" onClick={handleSave} disabled={saving}>
//                   {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="d-flex flex-column gap-3">
//               {profile.about && (
//                 <div className="card p-4">
//                   <h6 className="fw-700 mb-2"><i className="bi bi-person-lines-fill me-2 text-primary" />About</h6>
//                   <p className="mb-0 text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>{profile.about}</p>
//                 </div>
//               )}
//               <div className="card p-4">
//                 <h6 className="fw-700 mb-3"><i className="bi bi-info-circle me-2 text-primary" />Details</h6>
//                 <div className="row g-2">
//                   {[
//                     { icon: 'bi-envelope', label: 'Email', val: profile.email, show: isOwnProfile },
//                     { icon: 'bi-telephone', label: 'Phone', val: profile.phone, show: isOwnProfile },
//                     { icon: 'bi-geo-alt', label: 'Location', val: [profile.city, profile.country].filter(Boolean).join(', '), show: true },
//                     { icon: 'bi-mortarboard', label: 'Education', val: profile.education, show: true },
//                     { icon: 'bi-tools', label: 'Expertise', val: profile.expertise, show: true },
//                     { icon: 'bi-translate', label: 'Language', val: profile.lang?.toUpperCase(), show: true },
//                   ].filter(d => d.show && d.val).map((d, i) => (
//                     <div key={i} className="col-sm-6 d-flex align-items-start gap-2">
//                       <i className={`bi ${d.icon} text-primary mt-1`} style={{ flexShrink: 0 }} />
//                       <div>
//                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</div>
//                         <div style={{ fontSize: '0.875rem' }}>{d.val}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               {profile.is_creator && profile.creator_bio && (
//                 <div className="card p-4">
//                   <h6 className="fw-700 mb-2"><i className="bi bi-brush me-2 text-primary" />Creator Bio</h6>
//                   <p className="mb-0 text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>{profile.creator_bio}</p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Change Password Modal */}
//       <Modal show={showPwModal} onClose={() => setShowPwModal(false)} title="Change Password"
//         footer={
//           <div className="d-flex gap-2 ms-auto">
//             <button className="btn btn-outline-secondary" onClick={() => setShowPwModal(false)}>Cancel</button>
//             <button className="btn btn-primary" onClick={handleChangePassword}>Update Password</button>
//           </div>
//         }>
//         <div className="d-flex flex-column gap-3">
//           {(['current_password', 'new_password', 'confirm'] as const).map(f => (
//             <div key={f}>
//               <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
//                 {f === 'current_password' ? 'Current Password' : f === 'new_password' ? 'New Password' : 'Confirm New Password'}
//               </label>
//               <input type="password" className="form-control" value={pwForm[f]} onChange={e => setPwForm(p => ({ ...p, [f]: e.target.value }))} />
//             </div>
//           ))}
//         </div>
//       </Modal>

//       {/* Creator Request Modal */}
//       <Modal show={showCreatorModal} onClose={() => setShowCreatorModal(false)} title="Apply to Become a Creator"
//         footer={
//           <div className="d-flex gap-2 ms-auto">
//             <button className="btn btn-outline-secondary" onClick={() => setShowCreatorModal(false)}>Cancel</button>
//             <button className="btn btn-primary" onClick={handleCreatorRequest}>Submit Application</button>
//           </div>
//         }>
//         <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
//           Share your expertise by creating courses on Intellect. Tell us about yourself and what you'd like to teach.
//         </p>
//         <div className="mb-3">
//           <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Why do you want to be a creator?</label>
//           <textarea className="form-control" rows={4} placeholder="Describe what you want to teach and why…" value={creatorForm.motivation} onChange={e => setCreatorForm(p => ({ ...p, motivation: e.target.value }))} />
//         </div>
//         <div>
//           <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Portfolio / Website URL (optional)</label>
//           <input type="url" className="form-control" placeholder="https://…" value={creatorForm.portfolio_url} onChange={e => setCreatorForm(p => ({ ...p, portfolio_url: e.target.value }))} />
//         </div>
//       </Modal>
//     </div>
//   );

// }




// v2
// pages/profile/Profile.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi, creatorApi, authApi } from '@/services/api';
import { User } from '@/types';
import { Spinner, Modal, resolveImage } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';
import '@/styles/pages/profile/Profile.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface Education {
  degree?: string;
  institution?: string;
  year?: string | number;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  type?: string;
  url?: string;
  image_url?: string;
  tags?: string[];
  year?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  web:      { icon: 'bi-globe',          color: '#5826ee', label: 'Website' },
  mobile:   { icon: 'bi-phone',          color: '#7c4dff', label: 'Mobile App' },
  design:   { icon: 'bi-palette',        color: '#f38207', label: 'Design' },
  data:     { icon: 'bi-bar-chart-line', color: '#0ea5e9', label: 'Data / Analytics' },
  video:    { icon: 'bi-camera-video',   color: '#ef4444', label: 'Video' },
  writing:  { icon: 'bi-file-text',      color: '#10b981', label: 'Writing' },
  tool:     { icon: 'bi-tools',          color: '#6366f1', label: 'Tool / CLI' },
  research: { icon: 'bi-journal-text',   color: '#8b5cf6', label: 'Research' },
  other:    { icon: 'bi-box',            color: '#9ca3af', label: 'Project' },
};

const SOCIAL_META: Record<string, { icon: string; label: string }> = {
  linkedin:  { icon: 'bi-linkedin',   label: 'LinkedIn' },
  twitter:   { icon: 'bi-twitter-x',  label: 'Twitter/X' },
  github:    { icon: 'bi-github',     label: 'GitHub' },
  youtube:   { icon: 'bi-youtube',    label: 'YouTube' },
  website:   { icon: 'bi-globe2',     label: 'Website' },
  instagram: { icon: 'bi-instagram',  label: 'Instagram' },
  whatsapp:  { icon: 'bi-whatsapp',   label: 'WhatsApp' },
};

function parseJSON<T>(raw: T | string | undefined, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function ExpertiseTags({ raw }: { raw?: string }) {
  if (!raw) return null;
  const tags = raw.split(/[,;|]+/).map(t => t.trim()).filter(Boolean);
  return (
    <div className="pf-tags">
      {tags.map((t, i) => <span key={i} className="pf-tag">{t}</span>)}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProjectCard({ p }: { p: Project }) {
  const meta = PROJECT_TYPE_META[p.type || 'other'] || PROJECT_TYPE_META.other;
  return (
    <div className="pf-project-card">
      {p.image_url ? (
        <div className="pf-project-img">
          <img src={p.image_url} alt={p.title} />
        </div>
      ) : (
        <div className="pf-project-placeholder" style={{ background: `${meta.color}14` }}>
          <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '1.75rem' }} />
        </div>
      )}
      <div className="pf-project-body">
        <div className="pf-project-type-row">
          <i className={`bi ${meta.icon}`} style={{ color: meta.color }} />
          <span>{meta.label}</span>
          {p.year && <span className="pf-project-year">{p.year}</span>}
        </div>
        <h6 className="pf-project-title">{p.title}</h6>
        {p.description && (
          <p className="pf-project-desc">{p.description}</p>
        )}
        {p.tags && p.tags.length > 0 && (
          <div className="pf-project-tags">
            {p.tags.slice(0, 5).map((t, i) => <span key={i} className="pf-ptag">{t}</span>)}
          </div>
        )}
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="pf-project-link">
            <i className="bi bi-box-arrow-up-right me-1" />View Project
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = !username || username === me?.username;

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [creatorForm, setCreatorForm] = useState({ motivation: '', portfolio_url: '' });

  useEffect(() => {
    const load = async () => {
      try {
        if (isOwnProfile) {
          const r = await usersApi.getProfile();
          setProfile(r.data);
        } else {
          const r = await usersApi.getPublicProfile(username!);
          setProfile(r.data);
        }
      } catch { toast.error('Could not load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, [username]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const r = await usersApi.uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, image: r.data.image } : prev);
      updateUser({ image: r.data.image });
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingAvatar(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.new_password.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      await authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully!');
      setShowPwModal(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleCreatorRequest = async () => {
    if (!creatorForm.motivation.trim()) return toast.error('Please tell us why you want to be a creator');
    try {
      await creatorApi.requestRole({ requested_role: 'creator', ...creatorForm });
      toast.success('Application submitted! We\'ll notify you once reviewed.');
      setShowCreatorModal(false);
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Request failed'); }
  };

  if (loading) return <div className="pf-loading"><Spinner /></div>;
  if (!profile) return (
    <div className="pf-notfound">
      <i className="bi bi-person-x pf-notfound-icon" />
      <h5>Profile not found</h5>
      <p className="text-muted">This profile doesn't exist or is no longer active.</p>
    </div>
  );

  const avatarSrc = resolveImage(
    profile.image,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || profile.username)}&size=200&background=5826ee&color=fff`
  );

  const education = parseJSON<Education[]>(profile.education as any, []);
  const projects  = parseJSON<Project[]>(profile.projects as any, []);
  const expertise = (profile.expertise || '').split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  const socials   = profile.socials && typeof profile.socials === 'object' ? profile.socials : {};
  const bio       = profile.creator_bio || profile.about || '';
  const isInstructor = profile.roles?.some(r => ['tutor', 'creator', 'instructor'].includes(r));

  return (
    <div className="pf-page fade-in">

      {/* ── Hero ── */}
      <div className="pf-hero">
        <div className="pf-hero-inner">
          {/* Avatar */}
          <div className="pf-avatar-wrap">
            {/* <img src={avatarSrc} alt={profile.name || profile.username} className="pf-avatar" /> */}
            <img src={avatarSrc || undefined} alt={profile.name || profile.username} className="pf-avatar" />
            {profile.is_online && <span className="pf-online-dot" title="Online now" />}
            {isOwnProfile && (
              <>
                <button
                  className="pf-avatar-edit-btn"
                  onClick={() => fileRef.current?.click()}
                  title="Change photo"
                >
                  {uploadingAvatar
                    ? <span className="spinner-border spinner-border-sm" />
                    : <i className="bi bi-camera-fill" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </>
            )}
          </div>

          {/* Info */}
          <div className="pf-hero-info">
            {/* Roles */}
            <div className="pf-role-pills">
              {profile.roles?.map(r => (
                <span key={r} className={`pf-role-pill pf-role-pill--${r}`}>
                  {r === 'creator' && <i className="bi bi-patch-check-fill me-1" />}
                  {r === 'tutor' && <i className="bi bi-mortarboard-fill me-1" />}
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </span>
              ))}
              {profile.email_verified && (
                <span className="pf-role-pill pf-role-pill--verified">
                  <i className="bi bi-patch-check me-1" />Verified
                </span>
              )}
            </div>

            <h1 className="pf-name">{profile.name || profile.username}</h1>
            <p className="pf-username">@{profile.username}</p>
            {profile.title && <p className="pf-title">{profile.title}</p>}

            {/* Meta row */}
            <div className="pf-meta-row">
              {(profile.city || profile.country) && (
                <span className="pf-meta-item">
                  <i className="bi bi-geo-alt-fill" />
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
              {profile.lang && (
                <span className="pf-meta-item">
                  <i className="bi bi-translate" />{profile.lang.toUpperCase()}
                </span>
              )}
              {profile.created_at && (
                <span className="pf-meta-item">
                  <i className="bi bi-calendar3" />
                  Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Social links */}
            {Object.keys(socials).length > 0 && (
              <div className="pf-socials">
                {Object.entries(socials as Record<string, string>)
                  .filter(([, v]) => v)
                  .map(([key, url]) => {
                    const meta = SOCIAL_META[key] || { icon: 'bi-link-45deg', label: key };
                    const href = key === 'twitter' && !url.startsWith('http')
                      ? `https://x.com/${url}`
                      : key === 'whatsapp' && !url.startsWith('http')
                      ? `https://wa.me/${url}`
                      : url;
                    return (
                      <a key={key} href={href} target="_blank" rel="noopener noreferrer"
                         className="pf-social-link" title={meta.label}>
                        <i className={`bi ${meta.icon}`} />
                      </a>
                    );
                  })}
              </div>
            )}

            {/* Actions */}
            {isOwnProfile && (
              <div className="pf-actions">
                <button className="btn btn-primary btn-sm fw-600 border text-white"
                  onClick={() => navigate('/profile/edit')}>
                  <i className="bi bi-pencil me-1" />Edit Profile
                </button>
                <button className="btn btn-outline-secondary btn-sm border text-white"
                  onClick={() => setShowPwModal(true)}>
                  <i className="bi bi-lock me-1" />Change Password
                </button>
                {!profile.roles?.includes('creator') && (
                  <button className="btn btn-outline-primary btn-sm border text-white"
                    onClick={() => setShowCreatorModal(true)}>
                    <i className="bi bi-pencil-square me-1" />Become a Creator
                  </button>
                )}
                {isInstructor && (
                  <Link to={`/instructors/${profile.username}`}
                    className="btn btn-outline-secondary btn-sm" target="_blank">
                    <i className="bi bi-person-badge me-1" />Public Profile
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pf-body">
        <div className="pf-layout">

          {/* ── Main content ── */}
          <div className="pf-main">

            {/* About */}
            {bio && (
              <section className="pf-section">
                <h4 className="pf-section-title">
                  <i className="bi bi-person-lines-fill" />About
                </h4>
                <p className="pf-about">{bio}</p>
              </section>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <section className="pf-section">
                <h4 className="pf-section-title">
                  <i className="bi bi-grid-1x2" />Projects & Work
                </h4>
                <div className="pf-projects-grid">
                  {projects.map(p => <ProjectCard key={p.id} p={p} />)}
                </div>
              </section>
            )}

            {/* Education */}
            {education.length > 0 && (
              <section className="pf-section">
                <h4 className="pf-section-title">
                  <i className="bi bi-mortarboard" />Education
                </h4>
                <div className="pf-edu-timeline">
                  {education.map((e, i) => (
                    <div key={i} className="pf-edu-item">
                      <div className="pf-edu-marker">
                        <div className="pf-edu-dot" />
                        {i < education.length - 1 && <div className="pf-edu-line" />}
                      </div>
                      <div className="pf-edu-content">
                        {e.degree && <strong className="pf-edu-degree">{e.degree}</strong>}
                        {e.institution && <span className="pf-edu-institution">{e.institution}</span>}
                        {e.year && <span className="pf-edu-year">{e.year}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Details (own profile only — contact info) */}
            {isOwnProfile && (profile.email || profile.phone) && (
              <section className="pf-section">
                <h4 className="pf-section-title">
                  <i className="bi bi-person-vcard" />Contact Info <span className="pf-section-private">Only visible to you</span>
                </h4>
                <div className="pf-details-grid">
                  {profile.email && (
                    <div className="pf-detail-item">
                      <i className="bi bi-envelope-fill pf-detail-icon" />
                      <div>
                        <div className="pf-detail-label">Email</div>
                        <div className="pf-detail-value">{profile.email}</div>
                      </div>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="pf-detail-item">
                      <i className="bi bi-telephone-fill pf-detail-icon" />
                      <div>
                        <div className="pf-detail-label">Phone</div>
                        <div className="pf-detail-value">{profile.phone}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Banking — creator + own profile only */}
            {isOwnProfile && profile.is_creator && profile.bank_name && (
              <section className="pf-section">
                <h4 className="pf-section-title">
                  <i className="bi bi-bank" />Payout Details <span className="pf-section-private">Only visible to you</span>
                </h4>
                <div className="pf-details-grid">
                  {[
                    { icon: 'bi-building', label: 'Bank', val: profile.bank_name },
                    { icon: 'bi-credit-card', label: 'Account Number', val: profile.bank_account_number },
                    { icon: 'bi-person-check', label: 'Account Name', val: profile.bank_account_name },
                  ].filter(d => d.val).map((d, i) => (
                    <div key={i} className="pf-detail-item">
                      <i className={`bi ${d.icon} pf-detail-icon`} />
                      <div>
                        <div className="pf-detail-label">{d.label}</div>
                        <div className="pf-detail-value">{d.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="pf-sidebar">

            {/* Expertise */}
            {expertise.length > 0 && (
              <div className="pf-sidebar-card">
                <h5 className="pf-sidebar-title">
                  <i className="bi bi-lightning-charge-fill" />Expertise
                </h5>
                <div className="pf-expertise-wrap">
                  {expertise.map((t, i) => <span key={i} className="pf-expertise-tag">{t}</span>)}
                </div>
              </div>
            )}

            {/* Quick stats */}
            {(projects.length > 0 || education.length > 0 || expertise.length > 0) && (
              <div className="pf-sidebar-card">
                <h5 className="pf-sidebar-title">
                  <i className="bi bi-bar-chart-fill" />At a Glance
                </h5>
                <div className="pf-stats-grid">
                  {projects.length > 0 && (
                    <div className="pf-stat">
                      <span className="pf-stat-value">{projects.length}</span>
                      <span className="pf-stat-label">Project{projects.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {expertise.length > 0 && (
                    <div className="pf-stat">
                      <span className="pf-stat-value">{expertise.length}</span>
                      <span className="pf-stat-label">Skill{expertise.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {education.length > 0 && (
                    <div className="pf-stat">
                      <span className="pf-stat-value">{education.length}</span>
                      <span className="pf-stat-label">Education</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Own profile — edit nudge */}
            {isOwnProfile && (
              <div className="pf-sidebar-card pf-edit-nudge">
                <i className="bi bi-pencil-square pf-nudge-icon" />
                <p className="pf-nudge-text">
                  Keep your profile up to date to improve your visibility on Intellect.
                </p>
                <button
                  className="btn btn-primary btn-sm w-100 fw-600 border border-white"
                  onClick={() => navigate('/profile/edit')}
                >
                  Edit Profile
                </button>
              </div>
            )}

            {/* Public view — CTA */}
            {!isOwnProfile && isInstructor && (
              <div className="pf-sidebar-card pf-cta-card">
                <i className="bi bi-mortarboard-fill pf-cta-icon" />
                <p className="pf-cta-text">
                  Explore courses by {profile.name?.split(' ')[0] || 'this instructor'}
                </p>
                <Link
                  to={`/explore?instructor=${profile.username}`}
                  className="btn btn-primary btn-sm w-100 fw-600"
                >
                  Browse Their Courses
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      <Modal
        show={showPwModal}
        onClose={() => { setShowPwModal(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); }}
        title="Change Password"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={() => setShowPwModal(false)}>Cancel</button>
            <button className="btn btn-primary fw-600" onClick={handleChangePassword}>Update Password</button>
          </div>
        }
      >
        <div className="d-flex flex-column gap-3">
          {([
            { key: 'current_password', label: 'Current Password' },
            { key: 'new_password',     label: 'New Password' },
            { key: 'confirm',          label: 'Confirm New Password' },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>{f.label}</label>
              <div className="position-relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
                {f.key === 'confirm' && (
                  <button type="button" className="nav-icon-btn"
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowPw(p => !p)}>
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Creator Application Modal ── */}
      <Modal
        show={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        title="Apply to Become a Creator"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={() => setShowCreatorModal(false)}>Cancel</button>
            <button className="btn btn-primary fw-600" onClick={handleCreatorRequest}>Submit Application</button>
          </div>
        }
      >
        <p className="text-muted mb-4" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
          Share your expertise by creating courses on Intellect. Tell us about yourself and what you'd like to teach. We review every application personally.
        </p>
        <div className="mb-3">
          <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
            Why do you want to be a creator? <span className="text-danger">*</span>
          </label>
          <textarea className="form-control" rows={4}
            placeholder="Describe what you want to teach, your expertise, and why students should learn from you…"
            value={creatorForm.motivation}
            onChange={e => setCreatorForm(p => ({ ...p, motivation: e.target.value }))} />
        </div>
        <div>
          <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Portfolio / Website URL <span className="text-muted fw-normal">(optional)</span></label>
          <input type="url" className="form-control" placeholder="https://…"
            value={creatorForm.portfolio_url}
            onChange={e => setCreatorForm(p => ({ ...p, portfolio_url: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
