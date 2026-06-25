import { translations, type Lang } from './translations'

export type { Lang }

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'no'
  const host = window.location.hostname
  return (host === 'curioustide.com' || host === 'www.curioustide.com') ? 'en' : 'no'
}

type StringKeys = {
  [K in keyof typeof translations['no']]: typeof translations['no'][K] extends string ? K : never
}[keyof typeof translations['no']]

export function useT() {
  const lang = getLang()
  const t = translations[lang] as Record<string, unknown>
  return (key: StringKeys): string => {
    const val = t[key as string]
    return typeof val === 'string' ? val : (key as string)
  }
}

export function useSections() {
  const lang = getLang()
  return translations[lang]['help.sections'] as unknown as Array<{ tittel: string; innhold: string[] }>
}
