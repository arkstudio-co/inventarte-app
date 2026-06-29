'use client'

import { Mail, Phone, Globe } from 'lucide-react'

interface LandingFooterProps {
  companyInfo?: {
    social_links?: Record<string, string>
  } | null
}

export function LandingFooter({ companyInfo }: LandingFooterProps) {
  return (
    <footer className="bg-[var(--primary)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <span className="font-semibold">Dibujarte</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="mailto:arkstudio@gmail.com"
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
              <Mail size={16} />
              arkstudio@gmail.com
            </a>
            <a
              href="tel:3001234567"
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
              <Phone size={16} />
              3001234567
            </a>
          </div>
        </div>

        {companyInfo?.social_links && Object.keys(companyInfo.social_links).length > 0 && (
          <div className="flex items-center justify-center gap-6 mb-8">
            {Object.entries(companyInfo.social_links as Record<string, string>).map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white/60 hover:text-[var(--accent)] transition-colors text-sm capitalize"
              >
                <Globe size={14} />
                {key}
              </a>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-white/50">
          &copy; 2026 Ark Studio. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
