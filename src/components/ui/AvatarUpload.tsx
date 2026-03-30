'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X, Upload } from 'lucide-react';

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

  const generatedInitials =
    (name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';

  const displayInitials = initials ?? generatedInitials;

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
      setPreview(data.url); // usa URL remota, não o blob local
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
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {/* Avatar circle */}
        <div className="relative h-20 w-20 rounded-full overflow-hidden">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: color }}
            >
              {displayInitials}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

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

      {/* Explicit upload button — always visible */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
        ) : (
          <><Upload className="w-3.5 h-3.5" /> {preview ? 'Trocar logo' : 'Subir logo'}</>
        )}
      </button>

      <p className="text-[10px] text-zenith-gray">JPG, PNG ou WebP · máx. 2MB</p>

      {error && (
        <p className="text-xs text-red-500 text-center max-w-[160px]">{error}</p>
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
