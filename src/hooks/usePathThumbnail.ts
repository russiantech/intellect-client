// src/hooks/usePathThumbnail.ts
/**
 * usePathThumbnail — Reusable hook for path thumbnail upload
 * Follows the exact same pattern as course thumbnail upload.
 * Returns full accessible URL for the uploaded image.
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface ThumbnailUploadResult {
  thumbnail: string;   // filename stored in DB
  url: string;           // Full accessible URL
}

interface UsePathThumbnailReturn {
  uploading: boolean;
  uploadThumbnail: (pathId: number, file: File) => Promise<ThumbnailUploadResult | null>;
}

export function usePathThumbnail(): UsePathThumbnailReturn {
  const [uploading, setUploading] = useState(false);

  const uploadThumbnail = useCallback(async (
    pathId: number,
    file: File,
  ): Promise<ThumbnailUploadResult | null> => {
    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, WebP, or SVG images are allowed');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<ThumbnailUploadResult>(
        `/paths/${pathId}/thumbnail`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      toast.success('Thumbnail uploaded successfully');
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Thumbnail upload failed';
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, uploadThumbnail };
}
