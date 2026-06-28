'use client'

import { Mail, Phone, Globe } from 'lucide-react'

interface LandingFooterProps {
  companyInfo?: {
    social_links?: Record<string, string>
  } | null
}

export function LandingFooter({ companyInfo }: LandingFooterProps) {
  return (
    <footer className="border-t border-[var(--border-default)] py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="mailto:arkstudio@gmail.com"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--tint)] transition-colors group"
          >
            <Mail size={20} className="text-[var(--tint)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Email</p>
              <p className="text-sm text-[var(--ink-tertiary)] group-hover:text-[var(--tint)] transition-colors">
                arkstudio@gmail.com
              </p>
            </div>
          </a>

          <a
            href="tel:3001234567"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--tint)] transition-colors group"
          >
            <Phone size={20} className="text-[var(--tint)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Teléfono</p>
              <p className="text-sm text-[var(--ink-tertiary)] group-hover:text-[var(--tint)] transition-colors">
                3001234567
              </p>
            </div>
          </a>

          <a
            href="https://arkstudio.com.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--tint)] transition-colors group"
          >
            <Globe size={20} className="text-[var(--tint)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Sitio web</p>
              <p className="text-sm text-[var(--ink-tertiary)] group-hover:text-[var(--tint)] transition-colors">
                arkstudio.com.co
              </p>
            </div>
          </a>
        </div>

        {companyInfo?.social_links && Object.keys(companyInfo.social_links).length > 0 && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {Object.entries(companyInfo.social_links as Record<string, string>).map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[var(--ink-secondary)] hover:text-[var(--accent)] transition-colors capitalize"
              >
                <Globe size={14} />
                {key}
              </a>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-[var(--ink-tertiary)]">
          &copy; 2026 Ark Studio. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
