// pages/public/Instructors.tsx
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/shared';
import '@/styles/pages/instructors/Instructors.css';
import { Instructor } from '@/types';

export function ExpertisePills({ raw }: { raw?: string }) {
  if (!raw) return null;
  const tags = raw.split(/[,;|]+/).map(t => t.trim()).filter(Boolean).slice(0, 4);
  return (
    <div className="instructor-tags">
      {tags.map((t, i) => (
        <span key={i} className="instructor-tag" title={t}>{t}</span>
      ))}
    </div>
  );
}

export function InstructorCard({ instructor: t }: { instructor: Instructor }) {
  const bio = t.creator_bio || t.about || '';
  return (
    <Link to={`/instructors/${t.username}`} className="instructor-card-link">
      <div className="instructor-card">
        <div className="instructor-avatar-wrap">
          <Avatar image={t.image} name={t.name || t.username} size={76} />
          {t.is_online && <span className="online-dot" title="Online now" />}
        </div>

        <span className={`role-badge role-badge--${t.primary_role}`}>
          {t.primary_role === 'creator' ? (
            <><i className="bi bi-patch-check-fill me-1" />Creator</>
          ) : (
            <><i className="bi bi-mortarboard-fill me-1" />Tutor</>
          )}
        </span>

        <h6 className="instructor-name">{t.name || t.username}</h6>

        {t.title && <p className="instructor-title">{t.title}</p>}

        {(t.city || t.country) && (
          <p className="instructor-location">
            <i className="bi bi-geo-alt" />
            {[t.city, t.country].filter(Boolean).join(', ')}
          </p>
        )}

        {bio && (
          <p className="instructor-bio">
            {bio.length > 80 ? bio.slice(0, 80) + '…' : bio}
          </p>
        )}

        <ExpertisePills raw={t.expertise} />

        <div className="instructor-card-footer">
          <span className="view-profile-link">
            View Profile <i className="bi bi-arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}

