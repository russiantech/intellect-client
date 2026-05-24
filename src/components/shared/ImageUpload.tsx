// src/components/shared/ImageUpload.tsx
/**
 * ImageUpload — Reusable image upload component with preview
 * Used by: CourseEditor, AdminPathsPage, ProfileEdit, etc.
 * 
 * Features:
 * - Drag & drop or click to upload
 * - Image preview with remove option
 * - Upload progress state
 * - Returns full URL for immediate display
 */
import { useState, useRef, useCallback } from 'react';
import { resolveImage } from '@/utils/resolveImage';
import '@/styles/components/shared/ImageUpload.css';

interface ImageUploadProps {
  value?: string | null;
  onChange: (filename: string | null, url: string | null) => void;
  onUpload: (file: File) => Promise<{ thumbnail: string; url: string } | null>;
  uploading?: boolean;
  label?: string;
  helpText?: string;
  folder?: string;
  aspectRatio?: string;
  maxSizeMB?: number;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onUpload,
  uploading = false,
  label = 'Image',
  helpText = 'JPG, PNG, GIF, WebP. Max 5MB.',
  folder = 'uploads',
  aspectRatio = '16 / 9',
  maxSizeMB = 5,
  className = '',
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUrl = previewUrl || resolveImage(value, undefined, folder) || null;

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    const result = await onUpload(file);
    if (result) {
      onChange(result.thumbnail, result.url);
      setPreviewUrl(null);
    } else {
      setPreviewUrl(null);
    }
  }, [onUpload, onChange, maxSizeMB, folder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    onChange(null, null);
    setPreviewUrl(null);
  }, [onChange]);

  return (
    <div className={`image-upload-wrapper ${className}`}>
      {label && <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>{label}</label>}

      <div
        className={`image-upload-zone ${dragOver ? 'drag-over' : ''} ${currentUrl ? 'has-image' : ''}`}
        style={{ aspectRatio }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="d-none"
          onChange={handleInputChange}
          disabled={uploading}
        />

        {currentUrl ? (
          <div className="image-upload-preview">
            <img src={currentUrl} alt="Preview" />
            <div className="image-upload-overlay">
              {uploading ? (
                <div className="image-upload-spinner">
                  <span className="spinner-border spinner-border-sm" />
                  <span>Uploading…</span>
                </div>
              ) : (
                <div className="image-upload-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  >
                    <i className="bi bi-arrow-repeat" /> Change
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                  >
                    <i className="bi bi-trash" /> Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="image-upload-placeholder">
            {uploading ? (
              <div className="image-upload-spinner">
                <span className="spinner-border" />
                <span>Uploading…</span>
              </div>
            ) : (
              <>
                <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', opacity: 0.5 }} />
                <div className="image-upload-text">
                  <span className="fw-600">Click to upload</span>
                  <span className="text-muted">or drag and drop</span>
                </div>
                {helpText && <span className="image-upload-help">{helpText}</span>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
