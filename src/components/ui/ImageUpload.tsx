'use client'

import { useState, useRef } from 'react'
import { Image } from 'lucide-react'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function ImageUpload({ value, onChange, label = 'Imagen' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) onChange(data.url)
    setUploading(false)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--ink-secondary)]">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-default)] flex items-center justify-center text-[var(--ink-muted)] overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Image size={32} className="opacity-20" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--tint)] text-[var(--ink)] hover:bg-[var(--tint-hover)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Subir imagen'}
            </button>
            <span className="text-xs text-[var(--ink-muted)]">o pega una URL</span>
          </div>
          <input
            type="text"
            placeholder="https://..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
