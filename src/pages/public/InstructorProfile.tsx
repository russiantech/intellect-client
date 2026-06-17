// pages/public/InstructorProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersApi } from '@/services/api';
import { Avatar, Spinner } from '@/components/shared';
import '@/styles/pages/instructors/InstructorProfile.css';
import { usePageMeta, buildPersonSchema, buildBreadcrumbSchema, INTELLECT } from '@/hooks/usePageMeta';

interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  url?: string;
  image_url?: string;
  tags: string[];
  year?: number;
}

interface Education {
  degree?: string;
  institution?: string;
  year?: string | number;
}

interface InstructorFull {
  id: number;
  username: string;
  name: string;
  image?: string;
  title?: string;
  city?: string;
  country?: string;
  about?: string;
  creator_bio?: string;
  expertise?: string;
  education?: Education[] | string;
  socials?: Record<string, string>;
  projects?: Project[];
  primary_role: string;
  is_creator: boolean;
  creator_approved: boolean;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
}

const PROJECT_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  web:      { icon: 'bi-globe',         label: 'Website',       color: '#5826ee' },
  mobile:   { icon: 'bi-phone',         label: 'Mobile App',    color: '#7c4dff' },
  design:   { icon: 'bi-palette',       label: 'Design',        color: '#f38207' },
  data:     { icon: 'bi-bar-chart-line',label: 'Data/Analytics',color: '#0ea5e9' },
  video:    { icon: 'bi-camera-video',  label: 'Video',         color: '#ef4444' },
  writing:  { icon: 'bi-file-text',     label: 'Writing',       color: '#10b981' },
  tool:     { icon: 'bi-tools',         label: 'Tool/CLI',      color: '#6366f1' },
  research: { icon: 'bi-journal-text',  label: 'Research',      color: '#8b5cf6' },
  other:    { icon: 'bi-box',           label: 'Project',       color: '#9ca3af' },
};

const SOCIAL_META: Record<string, { icon: string; label: string }> = {
  linkedin:  { icon: 'bi-linkedin',   label: 'LinkedIn' },
  twitter:   { icon: 'bi-twitter-x',  label: 'Twitter/X' },
  github:    { icon: 'bi-github',     label: 'GitHub' },
  youtube:   { icon: 'bi-youtube',    label: 'YouTube' },
  website:   { icon: 'bi-globe2',     label: 'Website' },
  instagram: { icon: 'bi-instagram',  label: 'Instagram' },
};

function parseEducation(raw: Education[] | string | undefined): Education[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return [{ institution: raw }]; }
  }
  return Array.isArray(raw) ? raw : [];
}

function parseProjects(raw: Project[] | string | undefined): Project[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

function SocialLinks({ socials }: { socials?: Record<string, string> }) {
  if (!socials) return null;
  const entries = Object.entries(socials).filter(([, v]) => v);
  if (!entries.length) return null;
  return (

    // <div className="ip-socials">
    //   {entries.map(([key, url]) => {
    //     const meta = SOCIAL_META[key] || { icon: 'bi-link-45deg', label: key };
    //     return (
    //       <a key={key} href={url} target="_blank" rel="noopener noreferrer"
    //          className="ip-social-link" title={meta.label}>
    //         <i className={`bi ${meta.icon}`} />
    //       </a>
    //     );
    //   })}
    // </div>
    // v2
    <div className="ip-socials">
  {entries.map(([key, url]) => {
    const meta = SOCIAL_META[key] || { icon: 'bi-link-45deg', label: key };

    // Ensure external links have a protocol
    let normalizedUrl = url?.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    return (
      <a
        key={key}
        href={normalizedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ip-social-link"
        title={meta.label}
      >
        <i className={`bi ${meta.icon}`} />
      </a>
    );
  })}
</div>

  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const meta = PROJECT_TYPE_META[p.type] || PROJECT_TYPE_META.other;
  return (
    <div className="ip-project-card">
      {p.image_url ? (
        <div className="ip-project-img">
          <img src={p.image_url} alt={p.title} />
        </div>
      ) : (
        <div className="ip-project-placeholder" style={{ background: `${meta.color}18` }}>
          <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '2rem' }} />
        </div>
      )}
      <div className="ip-project-body">
        <div className="ip-project-type">
          <i className={`bi ${meta.icon} me-1`} style={{ color: meta.color }} />
          {meta.label}
          {p.year && <span className="ip-project-year">{p.year}</span>}
        </div>
        <h6 className="ip-project-title">{p.title}</h6>
        {p.description && <p className="ip-project-desc">{p.description}</p>}
        {p.tags?.length > 0 && (
          <div className="ip-project-tags">
            {p.tags.slice(0, 4).map((t, i) => <span key={i} className="ip-ptag">{t}</span>)}
          </div>
        )}
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="ip-project-link">
            <i className="bi bi-box-arrow-up-right me-1" />View Project
          </a>
        )}
      </div>
    </div>
  );
}

export default function InstructorProfile() {
  const { username } = useParams<{ username: string }>();
  const [instructor, setInstructor] = useState<InstructorFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ── Page meta (SEO, OG, Twitter Card, JSON-LD) ── */
  const roleLabel = instructor?.creator_approved && instructor?.is_creator
    ? 'Verified Creator'
    : instructor?.primary_role === 'tutor' ? 'Tutor' : 'Instructor';
  const location  = [instructor?.city, instructor?.country].filter(Boolean).join(', ');

  usePageMeta({
    title:       instructor ? `${instructor.name} — ${roleLabel}` : null,
    description: instructor
      ? [
          instructor.creator_bio || instructor.about,
          instructor.title,
          location,
          `${roleLabel} on ${INTELLECT}`,
        ].filter(Boolean).join(' · ').slice(0, 160)
      : null,
    image:    instructor?.image,
    keywords: [
      roleLabel,
      ...(instructor?.expertise || '').split(/[,;|]+/).map(s => s.trim()).filter(Boolean).slice(0, 6),
      'online instructor', INTELLECT,
    ],
    author: instructor?.name,
    type:   'website',
    schema: instructor
      ? {
          '@graph': [
            buildPersonSchema(instructor),
            buildBreadcrumbSchema([
              { name: 'Home',        path: '/' },
              { name: 'Instructors', path: '/instructors' },
              { name: instructor.name, path: `/instructors/${instructor.username}` },
            ]),
          ],
          '@context': 'https://schema.org',
        }
      : null,
  });

  useEffect(() => {
    if (!username) return;
    usersApi.getPublicProfile(username)
      .then(r => setInstructor(r.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="ip-loading"><Spinner /></div>;

  if (notFound || !instructor) return (
    <div className="ip-notfound">
      <i className="bi bi-person-x ip-notfound-icon" />
      <h4>Profile not found</h4>
      <p className="text-muted">This instructor profile doesn't exist or is no longer active.</p>
      <Link to="/instructors" className="btn btn-primary mt-2">Browse Instructors</Link>
    </div>
  );

  const education = parseEducation(instructor.education);
  const projects  = parseProjects(instructor.projects);
  const expertise = (instructor.expertise || '')
    .split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  const bio = instructor.creator_bio || instructor.about || '';

  return (
    <div className="ip-page fade-in">
      {/* ── Hero ── */}
      <div className="ip-hero">
        <div className="ip-hero-inner">
          <Link to="/instructors" className="ip-back rounded-pill border">
            <i className="bi bi-arrow-left me-1" />All Instructors
          </Link>
          <div className="ip-hero-content">
            <div className="ip-avatar-wrap">
              <Avatar image={instructor.image} name={instructor.name || instructor.username} size={110} />
              {instructor.is_online && <span className="ip-online-dot" />}
            </div>
            <div className="ip-hero-info">
              <div className="ip-role-badge">
                {instructor.creator_approved && instructor.is_creator ? (
                  <><i className="bi bi-patch-check-fill me-1" />Verified Creator</>
                ) : (
                  <><i className="bi bi-mortarboard-fill me-1" />
                    {instructor.primary_role === 'tutor' ? 'Tutor' : 'Instructor'}</>
                )}
              </div>
              <h1 className="ip-name">{instructor.name || instructor.username}</h1>
              {instructor.title && <p className="ip-title">{instructor.title}</p>}
              <div className="ip-meta-row">
                {(instructor.city || instructor.country) && (
                  <span className="ip-meta-item">
                    <i className="bi bi-geo-alt-fill" />
                    {[instructor.city, instructor.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="ip-meta-item">
                  <i className="bi bi-calendar3" />
                  Member since {new Date(instructor.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <SocialLinks socials={instructor.socials} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="ip-body">
        <div className="ip-layout">

          {/* ── Left / Main ── */}
          <div className="ip-main">

            {/* About */}
            {bio && (
              <section className="ip-section">
                <h3 className="ip-section-title">
                  <i className="bi bi-person-lines-fill" />About
                </h3>
                <p className="ip-about">{bio}</p>
              </section>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <section className="ip-section">
                <h3 className="ip-section-title">
                  <i className="bi bi-grid-1x2" />Projects & Work
                </h3>
                <div className="ip-projects-grid">
                  {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>
              </section>
            )}

            {/* Education */}
            {education.length > 0 && (
              <section className="ip-section">
                <h3 className="ip-section-title">
                  <i className="bi bi-mortarboard" />Education
                </h3>
                <div className="ip-education-list">
                  {education.map((e, i) => (
                    <div key={i} className="ip-edu-item">
                      <div className="ip-edu-dot" />
                      <div className="ip-edu-content">
                        {e.degree && <strong className="ip-edu-degree">{e.degree}</strong>}
                        {e.institution && <span className="ip-edu-institution">{e.institution}</span>}
                        {e.year && <span className="ip-edu-year">{e.year}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right / Sidebar ── */}
          <aside className="ip-sidebar">

            {/* Expertise */}
            {expertise.length > 0 && (
              <div className="ip-sidebar-card">
                <h5 className="ip-sidebar-title">
                  <i className="bi bi-lightning-charge-fill" />Expertise
                </h5>
                <div className="ip-expertise-tags">
                  {expertise.map((tag, i) => (
                    <span key={i} className="ip-expertise-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="ip-sidebar-card">
              <h5 className="ip-sidebar-title">
                <i className="bi bi-bar-chart-fill" />At a Glance
              </h5>
              <div className="ip-stats">
                {projects.length > 0 && (
                  <div className="ip-stat">
                    <span className="ip-stat-value">{projects.length}</span>
                    <span className="ip-stat-label">Project{projects.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {expertise.length > 0 && (
                  <div className="ip-stat">
                    <span className="ip-stat-value">{expertise.length}</span>
                    <span className="ip-stat-label">Skill Area{expertise.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {education.length > 0 && (
                  <div className="ip-stat">
                    <span className="ip-stat-value">{education.length}</span>
                    <span className="ip-stat-label">Education</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="ip-sidebar-card ip-cta-card">
              <i className="bi bi-mortarboard-fill ip-cta-icon" />
              <p className="ip-cta-text">Explore courses taught by {instructor.name?.split(' ')[0] || 'this instructor'}</p>
              <Link
                to={`/explore?instructor=${instructor.username}`}
                className="btn btn-primary w-100"
                style={{ fontSize: '0.85rem' }}
              >
                Browse Their Courses
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}