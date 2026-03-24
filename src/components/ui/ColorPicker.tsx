'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';

const PRESET_COLORS = [
  '#4040E8', '#7C3AED', '#9333EA', '#DB2777', '#DC2626',
  '#EA580C', '#F97316', '#D97706', '#F59E0B', '#65A30D',
  '#16A34A', '#10B981', '#0D9488', '#0284C7', '#3B82F6',
  '#8B5CF6', '#EC4899', '#EF4444', '#6B7280', '#111827',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label = 'Cor do cliente' }: ColorPickerProps) {
  const customInputRef = useRef<HTMLInputElement>(null);
  const isPreset = PRESET_COLORS.includes(value);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            className="w-7 h-7 rounded-full transition-all focus:outline-none"
            style={{
              backgroundColor: color,
              boxShadow: value === color
                ? `0 0 0 2px white, 0 0 0 4px ${color}`
                : 'none',
              transform: value === color ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}

        {/* Custom color button */}
        <button
          type="button"
          onClick={() => customInputRef.current?.click()}
          title="Cor personalizada"
          className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#4040E8] hover:text-[#4040E8] transition-colors"
          style={
            !isPreset
              ? { backgroundColor: value, borderColor: value, color: '#fff' }
              : {}
          }
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <input
          ref={customInputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-2 mt-3">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
          style={{ backgroundColor: value }}
        >
          AB
        </div>
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
    </div>
  );
}
