'use client';

import { useCallback, useRef, useState } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { Upload, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

/** 压缩图片：最大 1200px，JPEG 质量 0.8，确保 base64 不超过 ~800KB */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX = 1200;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload() {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const { imageDataUrls, imageFileName, setImage, addImage, removeImage } = useAnalysisStore();
  const isFirstImage = useRef(true);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const dataUrl = await compressImage(file);
      if (isFirstImage.current) {
        isFirstImage.current = false;
        setImage(dataUrl, file.name);
      } else {
        addImage(dataUrl);
      }
    },
    [setImage, addImage],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      for (const file of imageFiles) {
        await handleFile(file);
      }
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setImage('', '');
    setPreviewIndex(0);
    isFirstImage.current = true;
  }, [setImage]);

  const handleRemoveImage = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const remaining = imageDataUrls.length - 1;
      if (remaining === 0) {
        isFirstImage.current = true;
      }
      const newPreviewIndex = remaining === 0
        ? 0
        : Math.min(previewIndex, remaining - 1);
      removeImage(index);
      setPreviewIndex(newPreviewIndex);
    },
    [removeImage, previewIndex, imageDataUrls.length],
  );

  const navigateImages = (direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'prev') {
      setPreviewIndex((prev) => (prev > 0 ? prev - 1 : imageDataUrls.length - 1));
    } else {
      setPreviewIndex((prev) => (prev < imageDataUrls.length - 1 ? prev + 1 : 0));
    }
  };

  if (imageDataUrls.length > 0) {
    const currentImage = imageDataUrls[previewIndex];
    const showNavigation = imageDataUrls.length > 1;

    return (
      <div className="relative group">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
          <div className="relative">
            <img
              src={currentImage}
              alt={`Image ${previewIndex + 1}`}
              className="w-full max-h-96 object-contain rounded"
            />
            {showNavigation && (
              <>
                <button
                  onClick={(e) => navigateImages('prev', e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={(e) => navigateImages('next', e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imageDataUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setPreviewIndex(i); }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === previewIndex ? 'bg-[var(--gold)] w-4' : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 px-2 pb-1">
            <div className="flex items-center gap-2 text-sm text-[var(--gold-dim)] min-w-0">
              <FileText size={14} />
              <span className="truncate flex-1">{imageFileName}</span>
              {showNavigation && (
                <span className="text-xs text-[var(--foreground)]/40 shrink-0">
                  ({previewIndex + 1}/{imageDataUrls.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {imageDataUrls.length > 1 && (
                <button
                  onClick={(e) => handleRemoveImage(previewIndex, e)}
                  className="p-1.5 bg-black/60 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300"
                  title={t('upload.deleteImage')}
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={handleClear}
                className="p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('upload.clearAll')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center transition-all cursor-pointer detective-card
        ${isDragging
          ? 'border-[var(--gold)] bg-[var(--card-bg)] shadow-lg shadow-[var(--gold)]/10'
          : 'border-[var(--card-border)] hover:border-[var(--gold)]/50 bg-[var(--card-bg)]/50'}
      `}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          for (const file of files) {
            await handleFile(file);
          }
        }}
      />
      <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-[var(--gold-dim)]" />
      <p className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-[var(--foreground)]">{t('home.uploadPlaceholder')}</p>
      <p className="mt-1 text-xs sm:text-sm text-[var(--foreground)]/50">{t('home.uploadHint')}</p>
      <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-[var(--gold)]/50">{t('home.uploadMultiHint')}</p>
    </div>
  );
}
