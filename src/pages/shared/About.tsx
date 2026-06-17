import { Link } from 'react-router-dom';
import { usePageMeta, buildOrganizationSchema } from '@/hooks/usePageMeta';

export default function About() {
  usePageMeta({
    title:       'About Us',
    description: 'Intellect is a digital learning platform building a future where learning fits seamlessly into everyday life — empowering individuals to acquire skills on their own terms.',
    keywords:    ['about Intellect', 'online learning platform', 'e-learning Nigeria', 'course creators', 'digital education'],
    schema:      buildOrganizationSchema(),
  });

  const features = [
    { icon: 'bi-play-circle', title: 'Rich Content Types', desc: 'Video, PDF, PPT, audio, and interactive lessons — all in one platform.', color: 'blue' as const },
    { icon: 'bi-robot', title: 'AI Learning Assistant', desc: 'Get instant answers and personalized explanations right inside the player.', color: 'purple' as const },
    { icon: 'bi-award', title: 'Auto Certificates', desc: 'Earn a verified certificate automatically upon course completion.', color: 'yellow' as const },
    { icon: 'bi-people', title: 'Live Sessions', desc: 'Join scheduled classes with expert tutors and track attendance.', color: 'green' as const },
    { icon: 'bi-pencil-square', title: 'Creator Studio', desc: 'Build and sell courses. Set your pricing and earn while you teach.', color: 'teal' as const },
    { icon: 'bi-building', title: 'Organization Partnerships', desc: 'Offer Intellect courses to your team under a flexible partnership model.', color: 'red' as const },
  ];
  return (
    <div className="fade-in">
      <div className="rounded-3 mb-5 p-5 text-white" style={{ background: 'linear-gradient(135deg,#1a3a5c 0%,#2c6fad 100%)', minHeight: 260 }}>
        <h1 className="fw-bold mb-3" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>Intellect — Your Digital Learning Companion</h1>
        <p className="opacity-75 mb-4" style={{ maxWidth: 520, fontSize: '1rem', lineHeight: 1.7 }}>Building a future where learning fits seamlessly into everyday life — empowering individuals to acquire skills on their own terms.</p>
        <div className="d-flex gap-3 flex-wrap"><Link to="/explore" className="btn btn-light fw-600"><i className="bi bi-compass me-1" />Explore Courses</Link><Link to="/auth/signup" className="btn btn-outline-light fw-600"><i className="bi bi-person-plus me-1" />Get Started Free</Link></div>
      </div>
      <h2 className="small-title mb-4">What makes Intellect special</h2>
      <div className="row g-4 mb-5">
        {features.map(f => (
          <div key={f.title} className="col-sm-6 col-lg-4">
            <div className="card p-4 h-100">
              <div className={`stat-icon ${f.color} mb-3`} style={{ width: 52, height: 52, fontSize: '1.3rem' }}><i className={`bi ${f.icon}`} /></div>
              <h6 className="fw-700 mb-2">{f.title}</h6>
              <p className="text-muted mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5 text-center" style={{ background: 'linear-gradient(135deg,var(--primary-light),#e8f4fd)' }}>
        <i className="bi bi-mortarboard-fill text-primary mb-3" style={{ fontSize: '2.5rem' }} />
        <h3 className="fw-bold mb-2">Ready to start learning?</h3>
        <p className="text-muted mb-4" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>Join thousands of learners and educators. Free to get started.</p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link to="/auth/signup" className="btn btn-primary fw-600"><i className="bi bi-person-plus me-1" />Create Free Account</Link>
          <Link to="/explore" className="btn btn-outline-primary fw-600"><i className="bi bi-compass me-1" />Explore Courses</Link>
        </div>
      </div>
    </div>
  );
}