// // pages/dashboard/ProfileEdit.tsx
// // Comprehensive profile editor — personal info, professional details, projects, account.
// import { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { usersApi } from '@/services/api';
// import { useAuth } from '@/context/AuthContext';
// import { Avatar } from '@/components/shared';
// import '@/styles/pages/profile/ProfileEdit.css';

// // ── Types ──────────────────────────────────────────────────────────────────

// interface Education {
//   id: string;
//   degree: string;
//   institution: string;
//   year: string;
// }

// interface Project {
//   id: string;
//   title: string;
//   description: string;
//   type: string;
//   url: string;
//   image_url: string;
//   tags: string;    // comma-separated raw string in the form
//   year: string;
// }

// interface Socials {
//   linkedin: string;
//   twitter: string;
//   github: string;
//   youtube: string;
//   website: string;
//   instagram: string;
// }

// interface ProfileForm {
//   name: string;
//   title: string;
//   gender: string;
//   city: string;
//   country: string;
//   lang: string;
//   about: string;
//   creator_bio: string;
//   phone: string;
//   expertise: string;
// }

// const PROJECT_TYPES = [
//   { value: 'web',      label: 'Website / Web App',     icon: 'bi-globe' },
//   { value: 'mobile',   label: 'Mobile App',             icon: 'bi-phone' },
//   { value: 'design',   label: 'Design / UI',            icon: 'bi-palette' },
//   { value: 'data',     label: 'Data / Analytics',       icon: 'bi-bar-chart-line' },
//   { value: 'video',    label: 'Video / Media',          icon: 'bi-camera-video' },
//   { value: 'writing',  label: 'Writing / Publication',  icon: 'bi-file-text' },
//   { value: 'tool',     label: 'Tool / CLI / Library',   icon: 'bi-tools' },
//   { value: 'research', label: 'Research / Paper',       icon: 'bi-journal-text' },
//   { value: 'other',    label: 'Other',                  icon: 'bi-box' },
// ];

// const TABS = [
//   { key: 'personal',     label: 'Personal',     icon: 'bi-person' },
//   { key: 'professional', label: 'Professional', icon: 'bi-briefcase' },
//   { key: 'projects',     label: 'Projects',     icon: 'bi-grid-1x2' },
//   { key: 'socials',      label: 'Social Links', icon: 'bi-share' },
// ];

// function uid() { return Math.random().toString(36).slice(2, 9); }

// function emptyProject(): Project {
//   return { id: uid(), title: '', description: '', type: 'web', url: '', image_url: '', tags: '', year: '' };
// }

// function emptyEdu(): Education {
//   return { id: uid(), degree: '', institution: '', year: '' };
// }

// // ── Component ──────────────────────────────────────────────────────────────

// export default function ProfileEdit() {
//   const { user, setUser } = useAuth();
//   const navigate = useNavigate();
//   const [tab, setTab] = useState('personal');
//   const [saving, setSaving] = useState(false);
//   const [avatarUploading, setAvatarUploading] = useState(false);
//   const avatarRef = useRef<HTMLInputElement>(null);

//   // Form states
//   const [profile, setProfile] = useState<ProfileForm>({
//     name: '', title: '', gender: '', city: '', country: '',
//     lang: '', about: '', creator_bio: '', phone: '', expertise: '',
//   });
//   const [socials, setSocials] = useState<Socials>({
//     linkedin: '', twitter: '', github: '', youtube: '', website: '', instagram: '',
//   });
//   const [education, setEducation] = useState<Education[]>([emptyEdu()]);
//   const [projects, setProjects] = useState<Project[]>([]);

//   // Populate from user on mount
//   useEffect(() => {
//     if (!user) return;
//     setProfile({
//       name: user.name || '',
//       title: user.title || '',
//       gender: user.gender || '',
//       city: user.city || '',
//       country: user.country || '',
//       lang: user.lang || '',
//       about: user.about || '',
//       creator_bio: user.creator_bio || '',
//       phone: user.phone || '',
//       expertise: user.expertise || '',
//     });

//     if (user.socials && typeof user.socials === 'object') {
//       setSocials({ linkedin: '', twitter: '', github: '', youtube: '', website: '', instagram: '', ...user.socials });
//     }

//     if (user.education) {
//       const edu = typeof user.education === 'string' ? JSON.parse(user.education) : user.education;
//       if (Array.isArray(edu) && edu.length) {
//         setEducation(edu.map((e: any) => ({ id: uid(), degree: e.degree || '', institution: e.institution || '', year: String(e.year || '') })));
//       }
//     }

//     if (user?.projects) {
//       const projs = typeof user.projects === 'string' ? JSON.parse(user.projects) : user.projects;
//       if (Array.isArray(projs)) {
//         setProjects(projs.map((p: any) => ({
//           id: p.id || uid(),
//           title: p.title || '',
//           description: p.description || '',
//           type: p.type || 'other',
//           url: p.url || '',
//           image_url: p.image_url || '',
//           tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
//           year: String(p.year || ''),
//         })));
//       }
//     }
//   }, [user]);

//   const setP = (k: keyof ProfileForm, v: string) => setProfile(p => ({ ...p, [k]: v }));
//   const setS = (k: keyof Socials, v: string) => setSocials(s => ({ ...s, [k]: v }));

//   // ── Avatar upload ──
//   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setAvatarUploading(true);
//     try {
//       const form = new FormData();
//       form.append('file', file);
//       const res = await usersApi.uploadAvatar(form);
//       setUser?.({ ...user!, image: res.data.image });
//       toast.success('Avatar updated!');
//     } catch { toast.error('Avatar upload failed'); }
//     finally { setAvatarUploading(false); }
//   };

//   // ── Save ──
//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       const payload = {
//         ...profile,
//         socials: { ...socials },
//         education: education
//           .filter(e => e.institution || e.degree)
//           .map(({ id, ...rest }) => rest),
//         projects: projects
//           .filter(p => p.title)
//           .map(p => ({
//             id: p.id,
//             title: p.title,
//             description: p.description,
//             type: p.type,
//             url: p.url,
//             image_url: p.image_url,
//             tags: p.tags.split(',').map(t => t.trim()).filter(Boolean),
//             year: p.year ? parseInt(p.year) : undefined,
//           })),
//       };
//       const res = await usersApi.updateProfile(payload);
//       setUser?.({ ...user!, ...res.data });
//       toast.success('Profile updated!');
//     } catch { toast.error('Failed to save changes'); }
//     finally { setSaving(false); }
//   };

//   return (
//     <div className="pe-page fade-in">
//       {/* Header */}
//       <div className="pe-header">
//         <div>
//           <h4 className="pe-heading">Edit Profile</h4>
//           <p className="pe-subheading text-muted">
//             Keep your profile accurate and showcase your work professionally.
//           </p>
//         </div>
//         <div className="pe-header-actions">
//           <button className="btn btn-light btn-sm me-2" onClick={() => navigate(-1)}>
//             Cancel
//           </button>
//           <button className="btn btn-primary btn-sm fw-600" onClick={handleSave} disabled={saving}>
//             {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
//           </button>
//         </div>
//       </div>

//       <div className="pe-layout">
//         {/* ── Left: avatar + nav ── */}
//         <div className="pe-sidebar">
//           <div className="pe-avatar-card">
//             <div className="pe-avatar-wrap">
//               <Avatar image={user?.image} name={user?.name || user?.username || ''} size={90} />
//               {avatarUploading && (
//                 <div className="pe-avatar-overlay">
//                   <span className="spinner-border spinner-border-sm text-white" />
//                 </div>
//               )}
//               <button className="pe-avatar-btn" onClick={() => avatarRef.current?.click()} title="Change photo">
//                 <i className="bi bi-camera-fill" />
//               </button>
//             </div>
//             <input ref={avatarRef} type="file" accept="image/*" className="d-none" onChange={handleAvatarChange} />
//             <div className="pe-avatar-info">
//               <strong>{user?.name || user?.username}</strong>
//               <span className="text-muted" style={{ fontSize: '0.78rem' }}>@{user?.username}</span>
//             </div>
//           </div>

//           <nav className="pe-nav">
//             {TABS.map(t => (
//               <button
//                 key={t.key}
//                 className={`pe-nav-item ${tab === t.key ? 'active' : ''}`}
//                 onClick={() => setTab(t.key)}
//               >
//                 <i className={`bi ${t.icon}`} />
//                 {t.label}
//               </button>
//             ))}
//           </nav>
//         </div>

//         {/* ── Right: tab content ── */}
//         <div className="pe-content">

//           {/* ── PERSONAL ── */}
//           {tab === 'personal' && (
//             <div className="pe-section">
//               <h5 className="pe-section-title">Personal Information</h5>
//               <div className="row g-3">
//                 <div className="col-sm-6">
//                   <label className="pe-label">Full Name</label>
//                   <input className="form-control" value={profile.name} onChange={e => setP('name', e.target.value)} placeholder="Your full name" />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="pe-label">Phone Number</label>
//                   <input className="form-control" value={profile.phone} onChange={e => setP('phone', e.target.value)} placeholder="+234…" />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="pe-label">Gender</label>
//                   <select className="form-select" value={profile.gender} onChange={e => setP('gender', e.target.value)}>
//                     <option value="">Prefer not to say</option>
//                     <option value="male">Male</option>
//                     <option value="female">Female</option>
//                     <option value="other">Other</option>
//                   </select>
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="pe-label">Language</label>
//                   <input className="form-control" value={profile.lang} onChange={e => setP('lang', e.target.value)} placeholder="e.g. English, Yoruba" />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="pe-label">City</label>
//                   <input className="form-control" value={profile.city} onChange={e => setP('city', e.target.value)} placeholder="Lagos" />
//                 </div>
//                 <div className="col-sm-6">
//                   <label className="pe-label">Country</label>
//                   <input className="form-control" value={profile.country} onChange={e => setP('country', e.target.value)} placeholder="Nigeria" />
//                 </div>
//                 <div className="col-12">
//                   <label className="pe-label">About Me</label>
//                   <textarea className="form-control" rows={5} value={profile.about}
//                     onChange={e => setP('about', e.target.value)}
//                     placeholder="Write a short bio. This is visible on your public profile." />
//                   <div className="pe-hint">{profile.about.length}/1000 characters</div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ── PROFESSIONAL ── */}
//           {tab === 'professional' && (
//             <div className="pe-section">
//               <h5 className="pe-section-title">Professional Details</h5>
//               <div className="row g-3">
//                 <div className="col-12">
//                   <label className="pe-label">Professional Title</label>
//                   <input className="form-control" value={profile.title} onChange={e => setP('title', e.target.value)} placeholder="e.g. Full-Stack Developer | Data Scientist" />
//                 </div>
//                 <div className="col-12">
//                   <label className="pe-label">Areas of Expertise <span className="pe-hint-inline">comma-separated</span></label>
//                   <input className="form-control" value={profile.expertise}
//                     onChange={e => setP('expertise', e.target.value)}
//                     placeholder="React, Python, Machine Learning, UI/UX Design…" />
//                 </div>
//                 <div className="col-12">
//                   <label className="pe-label">Creator Bio <span className="pe-hint-inline">shown on course pages and your instructor profile</span></label>
//                   <textarea className="form-control" rows={6} value={profile.creator_bio}
//                     onChange={e => setP('creator_bio', e.target.value)}
//                     placeholder="Tell students about your background, teaching approach, and what makes your courses unique." />
//                 </div>

//                 {/* Education */}
//                 <div className="col-12">
//                   <div className="pe-sub-header">
//                     <label className="pe-label mb-0">Education</label>
//                     <button className="btn btn-sm pe-add-btn" onClick={() => setEducation(prev => [...prev, emptyEdu()])}>
//                       <i className="bi bi-plus-circle me-1" />Add
//                     </button>
//                   </div>
//                   <div className="pe-edu-list">
//                     {education.map((e, i) => (
//                       <div key={e.id} className="pe-edu-row">
//                         <div className="row g-2 flex-grow-1">
//                           <div className="col-sm-5">
//                             <input className="form-control form-control-sm" placeholder="Degree / Certification"
//                               value={e.degree} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
//                           </div>
//                           <div className="col-sm-5">
//                             <input className="form-control form-control-sm" placeholder="Institution"
//                               value={e.institution} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
//                           </div>
//                           <div className="col-sm-2">
//                             <input className="form-control form-control-sm" placeholder="Year"
//                               value={e.year} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
//                           </div>
//                         </div>
//                         <button className="pe-del-btn" onClick={() => setEducation(prev => prev.filter((_, j) => j !== i))}>
//                           <i className="bi bi-trash3" />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ── PROJECTS ── */}
//           {tab === 'projects' && (
//             <div className="pe-section">
//               <div className="pe-sub-header mb-3">
//                 <div>
//                   <h5 className="pe-section-title mb-0">Projects & Work</h5>
//                   <p className="pe-section-sub">Showcase your best work — websites, apps, designs, research, tools and more.</p>
//                 </div>
//                 <button className="btn btn-primary btn-sm fw-600" onClick={() => setProjects(prev => [...prev, emptyProject()])}>
//                   <i className="bi bi-plus-circle me-1" />Add Project
//                 </button>
//               </div>

//               {projects.length === 0 ? (
//                 <div className="pe-empty-projects">
//                   <i className="bi bi-grid-1x2 pe-empty-icon" />
//                   <p>No projects yet. Add your first project to showcase your work.</p>
//                   <button className="btn btn-primary" onClick={() => setProjects([emptyProject()])}>
//                     <i className="bi bi-plus me-1" />Add Your First Project
//                   </button>
//                 </div>
//               ) : (
//                 <div className="pe-projects-list">
//                   {projects.map((p, i) => (
//                     <div key={p.id} className="pe-project-block">
//                       <div className="pe-project-block-header">
//                         <span className="pe-project-num">Project {i + 1}</span>
//                         <button className="pe-del-btn" onClick={() => setProjects(prev => prev.filter((_, j) => j !== i))}>
//                           <i className="bi bi-trash3" />Remove
//                         </button>
//                       </div>
//                       <div className="row g-3">
//                         <div className="col-sm-8">
//                           <label className="pe-label">Project Title <span className="text-danger">*</span></label>
//                           <input className="form-control" placeholder="e.g. Intellect LMS, Budget Tracker App" value={p.title}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} />
//                         </div>
//                         <div className="col-sm-4">
//                           <label className="pe-label">Type</label>
//                           <select className="form-select" value={p.type}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, type: ev.target.value } : x))}>
//                             {PROJECT_TYPES.map(t => (
//                               <option key={t.value} value={t.value}>{t.label}</option>
//                             ))}
//                           </select>
//                         </div>
//                         <div className="col-12">
//                           <label className="pe-label">Description</label>
//                           <textarea className="form-control" rows={3}
//                             placeholder="What is this project? What problem does it solve? What was your role?"
//                             value={p.description}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, description: ev.target.value } : x))} />
//                         </div>
//                         <div className="col-sm-8">
//                           <label className="pe-label">Project URL</label>
//                           <input className="form-control" type="url" placeholder="https://…" value={p.url}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, url: ev.target.value } : x))} />
//                         </div>
//                         <div className="col-sm-4">
//                           <label className="pe-label">Year</label>
//                           <input className="form-control" placeholder="2024" value={p.year}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
//                         </div>
//                         <div className="col-sm-8">
//                           <label className="pe-label">Tags <span className="pe-hint-inline">comma-separated</span></label>
//                           <input className="form-control" placeholder="React, FastAPI, PostgreSQL, Figma…" value={p.tags}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, tags: ev.target.value } : x))} />
//                         </div>
//                         <div className="col-sm-4">
//                           <label className="pe-label">Preview Image URL</label>
//                           <input className="form-control" type="url" placeholder="https://…" value={p.image_url}
//                             onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, image_url: ev.target.value } : x))} />
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* ── SOCIALS ── */}
//           {tab === 'socials' && (
//             <div className="pe-section">
//               <h5 className="pe-section-title">Social Links</h5>
//               <p className="pe-section-sub">Add links to your profiles. These appear on your public instructor page.</p>
//               <div className="pe-socials-list">
//                 {(Object.keys(socials) as (keyof Socials)[]).map(key => {
//                   const iconMap: Record<string, string> = {
//                     linkedin: 'bi-linkedin', twitter: 'bi-twitter-x', github: 'bi-github',
//                     youtube: 'bi-youtube', website: 'bi-globe2', instagram: 'bi-instagram',
//                   };
//                   const placeholders: Record<string, string> = {
//                     linkedin: 'https://linkedin.com/in/…',
//                     twitter: 'https://x.com/…',
//                     github: 'https://github.com/…',
//                     youtube: 'https://youtube.com/@…',
//                     website: 'https://yourwebsite.com',
//                     instagram: 'https://instagram.com/…',
//                   };
//                   return (
//                     <div key={key} className="pe-social-row">
//                       <div className="pe-social-icon">
//                         <i className={`bi ${iconMap[key]}`} />
//                       </div>
//                       <div className="pe-social-label">
//                         {key.charAt(0).toUpperCase() + key.slice(1)}
//                       </div>
//                       <input
//                         className="form-control"
//                         type="url"
//                         placeholder={placeholders[key]}
//                         value={socials[key]}
//                         onChange={e => setS(key, e.target.value)}
//                       />
//                       {socials[key] && (
//                         <a href={socials[key]} target="_blank" rel="noopener noreferrer"
//                            className="pe-social-preview" title="Preview">
//                           <i className="bi bi-box-arrow-up-right" />
//                         </a>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* Floating save (mobile) */}
//           <div className="pe-save-bar">
//             <button className="btn btn-primary w-100 fw-600 py-2" onClick={handleSave} disabled={saving}>
//               {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



// v2
// pages/shared/user/ProfileEdit.tsx
// Comprehensive profile editor — personal info, professional details, projects, account.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/shared';
import '@/styles/pages/profile/ProfileEdit.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface Education {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  image_url: string;
  tags: string;    // comma-separated raw string in the form
  year: string;
}

interface Socials {
  linkedin: string;
  twitter: string;
  github: string;
  youtube: string;
  website: string;
  instagram: string;
}

interface ProfileForm {
  name: string;
  title: string;
  gender: string;
  city: string;
  country: string;
  lang: string;
  about: string;
  creator_bio: string;
  phone: string;
  expertise: string;
}

const PROJECT_TYPES = [
  { value: 'web',      label: 'Website / Web App',     icon: 'bi-globe' },
  { value: 'mobile',   label: 'Mobile App',             icon: 'bi-phone' },
  { value: 'design',   label: 'Design / UI',            icon: 'bi-palette' },
  { value: 'data',     label: 'Data / Analytics',       icon: 'bi-bar-chart-line' },
  { value: 'video',    label: 'Video / Media',          icon: 'bi-camera-video' },
  { value: 'writing',  label: 'Writing / Publication',  icon: 'bi-file-text' },
  { value: 'tool',     label: 'Tool / CLI / Library',   icon: 'bi-tools' },
  { value: 'research', label: 'Research / Paper',       icon: 'bi-journal-text' },
  { value: 'other',    label: 'Other',                  icon: 'bi-box' },
];

const TABS = [
  { key: 'personal',     label: 'Personal',     icon: 'bi-person' },
  { key: 'professional', label: 'Professional', icon: 'bi-briefcase' },
  { key: 'projects',     label: 'Projects',     icon: 'bi-grid-1x2' },
  { key: 'socials',      label: 'Social Links', icon: 'bi-share' },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

function emptyProject(): Project {
  return { id: uid(), title: '', description: '', type: 'web', url: '', image_url: '', tags: '', year: '' };
}

function emptyEdu(): Education {
  return { id: uid(), degree: '', institution: '', year: '' };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfileEdit() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Form states
  const [profile, setProfile] = useState<ProfileForm>({
    name: '', title: '', gender: '', city: '', country: '',
    lang: '', about: '', creator_bio: '', phone: '', expertise: '',
  });
  const [socials, setSocials] = useState<Socials>({
    linkedin: '', twitter: '', github: '', youtube: '', website: '', instagram: '',
  });
  const [education, setEducation] = useState<Education[]>([emptyEdu()]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Populate from user on mount
  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || '',
      title: user.title || '',
      gender: user.gender || '',
      city: user.city || '',
      country: user.country || '',
      lang: user.lang || '',
      about: user.about || '',
      creator_bio: user.creator_bio || '',
      phone: user.phone || '',
      expertise: user.expertise || '',
    });

    if (user.socials && typeof user.socials === 'object') {
      setSocials({ linkedin: '', twitter: '', github: '', youtube: '', website: '', instagram: '', ...user.socials });
    }

    if (user.education) {
      const edu = typeof user.education === 'string' ? JSON.parse(user.education) : user.education;
      if (Array.isArray(edu) && edu.length) {
        setEducation(edu.map((e: any) => ({ id: uid(), degree: e.degree || '', institution: e.institution || '', year: String(e.year || '') })));
      }
    }

    if (user.projects) {
      const projs = typeof user.projects === 'string' ? JSON.parse(user.projects) : user.projects;
      if (Array.isArray(projs)) {
        setProjects(projs.map((p: any) => ({
          id: p.id || uid(),
          title: p.title || '',
          description: p.description || '',
          type: p.type || 'other',
          url: p.url || '',
          image_url: p.image_url || '',
          tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
          year: String(p.year || ''),
        })));
      }
    }
  }, [user]);

  const setP = (k: keyof ProfileForm, v: string) => setProfile(p => ({ ...p, [k]: v }));
  const setS = (k: keyof Socials, v: string) => setSocials(s => ({ ...s, [k]: v }));

  // ── Avatar upload ──
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const res = await usersApi.uploadAvatar(file);
      setUser?.({ ...user!, image: res.data.image });
      toast.success('Avatar updated!');
    } catch { toast.error('Avatar upload failed'); }
    finally { setAvatarUploading(false); }
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profile,
        socials: { ...socials },
        education: education
          .filter(e => e.institution || e.degree)
          .map(({ id, ...rest }) => rest),
        projects: projects
          .filter(p => p.title)
          .map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            type: p.type,
            url: p.url,
            image_url: p.image_url,
            tags: p.tags.split(',').map(t => t.trim()).filter(Boolean),
            year: p.year ? parseInt(p.year) : undefined,
          })),
      };
      const res = await usersApi.updateProfile(payload);
      setUser?.({ ...user!, ...res.data });
      toast.success('Profile updated!');
    } catch { toast.error('Failed to save changes'); }
    finally { setSaving(false); }
  };

  return (
    <div className="pe-page fade-in">
      {/* Header */}
      <div className="pe-header">
        <div>
          <h4 className="pe-heading">Edit Profile</h4>
          <p className="pe-subheading text-muted">
            Keep your profile accurate and showcase your work professionally.
          </p>
        </div>
        <div className="pe-header-actions">
          <button className="btn btn-light btn-sm me-2" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm fw-600" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="pe-layout">
        {/* ── Left: avatar + nav ── */}
        <div className="pe-sidebar">
          <div className="pe-avatar-card">
            <div className="pe-avatar-wrap">
              <Avatar image={user?.image} name={user?.name || user?.username || ''} size={90} />
              {avatarUploading && (
                <div className="pe-avatar-overlay">
                  <span className="spinner-border spinner-border-sm text-white" />
                </div>
              )}
              <button className="pe-avatar-btn" onClick={() => avatarRef.current?.click()} title="Change photo">
                <i className="bi bi-camera-fill" />
              </button>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="d-none" onChange={handleAvatarChange} />
            <div className="pe-avatar-info">
              <strong>{user?.name || user?.username}</strong>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>@{user?.username}</span>
            </div>
          </div>

          <nav className="pe-nav">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`pe-nav-item ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <i className={`bi ${t.icon}`} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Right: tab content ── */}
        <div className="pe-content">

          {/* ── PERSONAL ── */}
          {tab === 'personal' && (
            <div className="pe-section">
              <h5 className="pe-section-title">Personal Information</h5>
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="pe-label">Full Name</label>
                  <input className="form-control" value={profile.name} onChange={e => setP('name', e.target.value)} placeholder="Your full name" />
                </div>
                <div className="col-sm-6">
                  <label className="pe-label">Phone Number</label>
                  <input className="form-control" value={profile.phone} onChange={e => setP('phone', e.target.value)} placeholder="+234…" />
                </div>
                <div className="col-sm-6">
                  <label className="pe-label">Gender</label>
                  <select className="form-select" value={profile.gender} onChange={e => setP('gender', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="pe-label">Language</label>
                  <input className="form-control" value={profile.lang} onChange={e => setP('lang', e.target.value)} placeholder="e.g. English, Yoruba" />
                </div>
                <div className="col-sm-6">
                  <label className="pe-label">City</label>
                  <input className="form-control" value={profile.city} onChange={e => setP('city', e.target.value)} placeholder="Lagos" />
                </div>
                <div className="col-sm-6">
                  <label className="pe-label">Country</label>
                  <input className="form-control" value={profile.country} onChange={e => setP('country', e.target.value)} placeholder="Nigeria" />
                </div>
                <div className="col-12">
                  <label className="pe-label">About Me</label>
                  <textarea className="form-control" rows={5} value={profile.about}
                    onChange={e => setP('about', e.target.value)}
                    placeholder="Write a short bio. This is visible on your public profile." />
                  <div className="pe-hint">{profile.about.length}/1000 characters</div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFESSIONAL ── */}
          {tab === 'professional' && (
            <div className="pe-section">
              <h5 className="pe-section-title">Professional Details</h5>
              <div className="row g-3">
                <div className="col-12">
                  <label className="pe-label">Professional Title</label>
                  <input className="form-control" value={profile.title} onChange={e => setP('title', e.target.value)} placeholder="e.g. Full-Stack Developer | Data Scientist" />
                </div>
                <div className="col-12">
                  <label className="pe-label">Areas of Expertise <span className="pe-hint-inline">comma-separated</span></label>
                  <input className="form-control" value={profile.expertise}
                    onChange={e => setP('expertise', e.target.value)}
                    placeholder="React, Python, Machine Learning, UI/UX Design…" />
                </div>
                <div className="col-12">
                  <label className="pe-label">Creator Bio <span className="pe-hint-inline">shown on course pages and your instructor profile</span></label>
                  <textarea className="form-control" rows={6} value={profile.creator_bio}
                    onChange={e => setP('creator_bio', e.target.value)}
                    placeholder="Tell students about your background, teaching approach, and what makes your courses unique." />
                </div>

                {/* Education */}
                <div className="col-12">
                  <div className="pe-sub-header">
                    <label className="pe-label mb-0">Education</label>
                    <button className="btn btn-sm pe-add-btn" onClick={() => setEducation(prev => [...prev, emptyEdu()])}>
                      <i className="bi bi-plus-circle me-1" />Add
                    </button>
                  </div>
                  <div className="pe-edu-list">
                    {education.map((e, i) => (
                      <div key={e.id} className="pe-edu-row">
                        <div className="row g-2 flex-grow-1">
                          <div className="col-sm-5">
                            <input className="form-control form-control-sm" placeholder="Degree / Certification"
                              value={e.degree} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
                          </div>
                          <div className="col-sm-5">
                            <input className="form-control form-control-sm" placeholder="Institution"
                              value={e.institution} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
                          </div>
                          <div className="col-sm-2">
                            <input className="form-control form-control-sm" placeholder="Year"
                              value={e.year} onChange={ev => setEducation(prev => prev.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
                          </div>
                        </div>
                        <button className="pe-del-btn" onClick={() => setEducation(prev => prev.filter((_, j) => j !== i))}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROJECTS ── */}
          {tab === 'projects' && (
            <div className="pe-section">
              <div className="pe-sub-header mb-3">
                <div>
                  <h5 className="pe-section-title mb-0">Projects & Work</h5>
                  <p className="pe-section-sub">Showcase your best work — websites, apps, designs, research, tools and more.</p>
                </div>
                <button className="btn btn-primary btn-sm fw-600" onClick={() => setProjects(prev => [...prev, emptyProject()])}>
                  <i className="bi bi-plus-circle me-1" />Add Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="pe-empty-projects">
                  <i className="bi bi-grid-1x2 pe-empty-icon" />
                  <p>No projects yet. Add your first project to showcase your work.</p>
                  <button className="btn btn-primary" onClick={() => setProjects([emptyProject()])}>
                    <i className="bi bi-plus me-1" />Add Your First Project
                  </button>
                </div>
              ) : (
                <div className="pe-projects-list">
                  {projects.map((p, i) => (
                    <div key={p.id} className="pe-project-block">
                      <div className="pe-project-block-header">
                        <span className="pe-project-num">Project {i + 1}</span>
                        <button className="pe-del-btn" onClick={() => setProjects(prev => prev.filter((_, j) => j !== i))}>
                          <i className="bi bi-trash3" />Remove
                        </button>
                      </div>
                      <div className="row g-3">
                        <div className="col-sm-8">
                          <label className="pe-label">Project Title <span className="text-danger">*</span></label>
                          <input className="form-control" placeholder="e.g. Intellect LMS, Budget Tracker App" value={p.title}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} />
                        </div>
                        <div className="col-sm-4">
                          <label className="pe-label">Type</label>
                          <select className="form-select" value={p.type}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, type: ev.target.value } : x))}>
                            {PROJECT_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="pe-label">Description</label>
                          <textarea className="form-control" rows={3}
                            placeholder="What is this project? What problem does it solve? What was your role?"
                            value={p.description}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, description: ev.target.value } : x))} />
                        </div>
                        <div className="col-sm-8">
                          <label className="pe-label">Project URL</label>
                          <input className="form-control" type="url" placeholder="https://…" value={p.url}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, url: ev.target.value } : x))} />
                        </div>
                        <div className="col-sm-4">
                          <label className="pe-label">Year</label>
                          <input className="form-control" placeholder="2024" value={p.year}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
                        </div>
                        <div className="col-sm-8">
                          <label className="pe-label">Tags <span className="pe-hint-inline">comma-separated</span></label>
                          <input className="form-control" placeholder="React, FastAPI, PostgreSQL, Figma…" value={p.tags}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, tags: ev.target.value } : x))} />
                        </div>
                        <div className="col-sm-4">
                          <label className="pe-label">Preview Image URL</label>
                          <input className="form-control" type="url" placeholder="https://…" value={p.image_url}
                            onChange={ev => setProjects(prev => prev.map((x, j) => j === i ? { ...x, image_url: ev.target.value } : x))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SOCIALS ── */}
          {tab === 'socials' && (
            <div className="pe-section">
              <h5 className="pe-section-title">Social Links</h5>
              <p className="pe-section-sub">Add links to your profiles. These appear on your public instructor page.</p>
              <div className="pe-socials-list">
                {(Object.keys(socials) as (keyof Socials)[]).map(key => {
                  const iconMap: Record<string, string> = {
                    linkedin: 'bi-linkedin', twitter: 'bi-twitter-x', github: 'bi-github',
                    youtube: 'bi-youtube', website: 'bi-globe2', instagram: 'bi-instagram',
                  };
                  const placeholders: Record<string, string> = {
                    linkedin: 'https://linkedin.com/in/…',
                    twitter: 'https://x.com/…',
                    github: 'https://github.com/…',
                    youtube: 'https://youtube.com/@…',
                    website: 'https://yourwebsite.com',
                    instagram: 'https://instagram.com/…',
                  };
                  return (
                    <div key={key} className="pe-social-row">
                      <div className="pe-social-icon">
                        <i className={`bi ${iconMap[key]}`} />
                      </div>
                      <div className="pe-social-label">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </div>
                      <input
                        className="form-control"
                        type="url"
                        placeholder={placeholders[key]}
                        value={socials[key]}
                        onChange={e => setS(key, e.target.value)}
                      />
                      {socials[key] && (
                        <a href={socials[key]} target="_blank" rel="noopener noreferrer"
                           className="pe-social-preview" title="Preview">
                          <i className="bi bi-box-arrow-up-right" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating save (mobile) */}
          <div className="pe-save-bar">
            <button className="btn btn-primary w-100 fw-600 py-2" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
