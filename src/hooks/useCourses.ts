import { useState, useEffect, useCallback } from 'react';
import { coursesApi } from '@/services/api';
import { Course, PaginatedResponse } from '@/types';

interface CourseFilters {
  search?: string;
  category?: string;
  level?: string;
  sort?: string;
  featured?: boolean;
  status?: string;
  creator_id?: number;
  page?: number;
  per_page?: number;
}

export function useCourses(filters: CourseFilters = {}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await coursesApi.list({
        status: 'published',
        per_page: 12,
        page: 1,
        ...filters,
      });
      setCourses(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { courses, total, loading, error, refetch: fetch };
}

export function useCourse(idOrSlug: string | number | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) return;
    setLoading(true);
    coursesApi.get(idOrSlug)
      .then(r => setCourse(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Course not found'))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  return { course, loading, error };
}
