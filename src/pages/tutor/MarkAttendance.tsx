import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, usersApi } from '@/services/api';
import { Spinner, PageTitle, Avatar } from '@/components/shared/index';

export default function MarkAttendancePage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [schedule, setSchedule] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scheduleId) return;
    Promise.all([
      adminApi.listSchedules(),
      // In a real app we'd have a students-for-schedule endpoint
      usersApi.listUsers({ role: 'student', per_page: 50 }),
    ]).then(([schedRes, studRes]) => {
      const found = (schedRes.data || []).find((s: any) => s.id === Number(scheduleId));
      setSchedule(found);
      const studs = studRes.data.items || [];
      setStudents(studs);
      // Default all absent
      const defaults: Record<number, boolean> = {};
      studs.forEach((s: any) => { defaults[s.id] = false; });
      setAttendance(defaults);
    }).finally(() => setLoading(false));
  }, [scheduleId]);

  const toggleAll = (present: boolean) => {
    const updated: Record<number, boolean> = {};
    students.forEach(s => { updated[s.id] = present; });
    setAttendance(updated);
  };

  const handleSave = async () => {
    if (!scheduleId) return;
    setSaving(true);
    try {
      const presentIds = students.filter(s => attendance[s.id]).map(s => s.id);
      const absentIds = students.filter(s => !attendance[s.id]).map(s => s.id);

      if (presentIds.length > 0) {
        await adminApi.markAttendance(Number(scheduleId), { schedule_id: Number(scheduleId), student_ids: presentIds, present: true });
      }
      if (absentIds.length > 0) {
        await adminApi.markAttendance(Number(scheduleId), { schedule_id: Number(scheduleId), student_ids: absentIds, present: false });
      }

      toast.success(`Attendance saved: ${presentIds.length} present, ${absentIds.length} absent`);
    } catch { toast.error('Failed to save attendance'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="fade-in">
      <PageTitle
        title="Mark Attendance"
        subtitle={schedule ? `${schedule.title} — ${new Date(schedule.start_time).toLocaleString()}` : `Schedule #${scheduleId}`}
        crumbs={[{ label: 'Tutor' }, { label: 'Schedules', href: '/tutor/schedules' }, { label: 'Attendance' }]}
      />

      {/* Summary bar */}
      <div className="row g-3 mb-4">
        <div className="col-4">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3">{students.length}</div>
            <div className="text-muted small">Total Students</div>
          </div>
        </div>
        <div className="col-4">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-success">{presentCount}</div>
            <div className="text-muted small">Present</div>
          </div>
        </div>
        <div className="col-4">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-danger">{absentCount}</div>
            <div className="text-muted small">Absent</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button className="btn btn-sm btn-success btn-icon-start" onClick={() => toggleAll(true)}>
          <i className="bi bi-check-all" /> Mark All Present
        </button>
        <button className="btn btn-sm btn-outline-secondary btn-icon-start" onClick={() => toggleAll(false)}>
          <i className="bi bi-x" /> Mark All Absent
        </button>
      </div>

      {/* Student list */}
      <div className="card overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th style={{ width: 120 }}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-muted py-4">No students found for this course.</td></tr>
              ) : students.map(student => (
                <tr key={student.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Avatar image={student.image} name={student.name || student.username} size={32} />
                      <span className="fw-600" style={{ fontSize: '0.875rem' }}>{student.name || student.username}</span>
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>{student.email}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className={`btn btn-sm fw-600 ${attendance[student.id] ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ minWidth: 44 }}
                        onClick={() => setAttendance(prev => ({ ...prev, [student.id]: true }))}
                      >
                        <i className="bi bi-check" />
                      </button>
                      <button
                        className={`btn btn-sm fw-600 ${!attendance[student.id] ? 'btn-danger' : 'btn-outline-secondary'}`}
                        style={{ minWidth: 44 }}
                        onClick={() => setAttendance(prev => ({ ...prev, [student.id]: false }))}
                      >
                        <i className="bi bi-x" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="d-flex gap-3">
        <Link to="/tutor/schedules" className="btn btn-outline-secondary">Cancel</Link>
        <button className="btn btn-primary fw-600 btn-icon-start" onClick={handleSave} disabled={saving || students.length === 0}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-check-circle" /> Save Attendance</>}
        </button>
      </div>
    </div>
  );
}
