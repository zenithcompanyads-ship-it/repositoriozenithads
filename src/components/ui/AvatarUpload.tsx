'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

interface AvatarUploadProps {
  name: string;
  color: string;
  initials?: string;
  currentAvatarUrl?: string | null;
  onUpload: (url: string) => void;
  clientId?: string; // if editing existing client
}

export function AvatarUpload({
  name,
  color,
  initials,
  currentAvatarUrl,
  onUpload,
  clientId,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const displayInitials =
    initials ??
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Apenas JPG, PNG ou WebP são aceitos.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Tamanho máximo: 2MB.');
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    if (!clientId) {
      // New client — store file as data URL for form submission
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpload(dataUrl);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Existing client — upload now
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/admin/clients/${clientId}/avatar`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload.');
      setPreview(currentAvatarUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onUpload('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        {/* Avatar circle */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative h-20 w-20 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4040E8]"
          title="Alterar foto"
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: color }}
            >
              {displayInitials}
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
        </button>

        {/* Remove button */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow"
            title="Remover foto"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">Clique para alterar foto</p>
      <p className="text-[10px] text-gray-300">JPG, PNG ou WebP · máx. 2MB</p>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
