import it from './it';
import en from './en';

const translations = { it, en } as const;
export type Lang = keyof typeof translations;

export function t(lang: Lang) {
  return translations[lang];
}
