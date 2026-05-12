import { useState, useEffect } from 'react';
import { enrollmentsApi } from '@/services/api';
import { Enrollment, Certificate } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useEnrollments() {
  const { isAuthenticated } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    enrollmentsApi.myCourses()
      .then(r => setEnrollments(r.data || []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const isEnrolled = (courseId: number) =>
    enrollments.some(e => e.course_id === courseId);

  const getProgress = (courseId: number) => {
    const e = enrollments.find(en => en.course_id === courseId);
    return e?.progress_pct ?? 0;
  };

  return { enrollments, loading, isEnrolled, getProgress };
}

export function useCertificates() {
  const { isAuthenticated } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    enrollmentsApi.myCertificates()
      .then(r => setCerts(r.data || []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return { certs, loading };
}
