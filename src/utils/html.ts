import type { NxLogoColors } from '../config/constants'

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch)
}

/**
 * NX monogram — the official Nexbaron logo (matches nexbaron-web/public/icon.svg).
 * Must be used in every server-generated email/PDF, never a text fallback.
 */
export function logoNx(colors: NxLogoColors, width = 44, height = 44): string {
  const id = `lg_${colors.stop1.replace('#', '')}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width="${width}" height="${height}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${colors.stop1}"/>
        <stop offset="1" stop-color="${colors.stop2}"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="#0f172a"/>
    <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="url(#${id})" stroke-width="2"/>
    <g fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 7.5 V24.5"/>
      <path d="M23 7.5 V24.5"/>
      <path d="M9 7.5 L23 24.5"/>
    </g>
  </svg>`
}