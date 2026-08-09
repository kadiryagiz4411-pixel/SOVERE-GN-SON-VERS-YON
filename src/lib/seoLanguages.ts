// ============================================================
// SEO LANGUAGE DATA — Supported Languages for Programmatic SEO
// ============================================================

export interface SEOLanguage {
  slug: string;
  name: string;
  nativeName: string;
  region: string;
}

export const SEO_LANGUAGES: SEOLanguage[] = [
  { slug: 'english', name: 'English', nativeName: 'English', region: 'Global' },
  { slug: 'turkish', name: 'Turkish', nativeName: 'Türkçe', region: 'Turkey' },
  { slug: 'german', name: 'German', nativeName: 'Deutsch', region: 'Germany' },
  { slug: 'french', name: 'French', nativeName: 'Français', region: 'France' },
  { slug: 'spanish', name: 'Spanish', nativeName: 'Español', region: 'Spain/LATAM' },
  { slug: 'portuguese', name: 'Portuguese', nativeName: 'Português', region: 'Brazil/Portugal' },
  { slug: 'italian', name: 'Italian', nativeName: 'Italiano', region: 'Italy' },
  { slug: 'dutch', name: 'Dutch', nativeName: 'Nederlands', region: 'Netherlands' },
  { slug: 'polish', name: 'Polish', nativeName: 'Polski', region: 'Poland' },
  { slug: 'russian', name: 'Russian', nativeName: 'Русский', region: 'Russia' },
  { slug: 'japanese', name: 'Japanese', nativeName: '日本語', region: 'Japan' },
  { slug: 'korean', name: 'Korean', nativeName: '한국어', region: 'South Korea' },
  { slug: 'chinese', name: 'Chinese', nativeName: '中文', region: 'China' },
  { slug: 'arabic', name: 'Arabic', nativeName: 'العربية', region: 'Middle East' },
  { slug: 'hindi', name: 'Hindi', nativeName: 'हिन्दी', region: 'India' },
  { slug: 'indonesian', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'Indonesia' },
  { slug: 'vietnamese', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'Vietnam' },
  { slug: 'thai', name: 'Thai', nativeName: 'ภาษาไทย', region: 'Thailand' },
  { slug: 'swedish', name: 'Swedish', nativeName: 'Svenska', region: 'Sweden' },
  { slug: 'danish', name: 'Danish', nativeName: 'Dansk', region: 'Denmark' },
  { slug: 'norwegian', name: 'Norwegian', nativeName: 'Norsk', region: 'Norway' },
  { slug: 'finnish', name: 'Finnish', nativeName: 'Suomi', region: 'Finland' },
  { slug: 'czech', name: 'Czech', nativeName: 'Čeština', region: 'Czech Republic' },
  { slug: 'romanian', name: 'Romanian', nativeName: 'Română', region: 'Romania' },
  { slug: 'greek', name: 'Greek', nativeName: 'Ελληνικά', region: 'Greece' },
  { slug: 'ukrainian', name: 'Ukrainian', nativeName: 'Українська', region: 'Ukraine' },
  { slug: 'hungarian', name: 'Hungarian', nativeName: 'Magyar', region: 'Hungary' },
  { slug: 'hebrew', name: 'Hebrew', nativeName: 'עברית', region: 'Israel' },
  { slug: 'malay', name: 'Malay', nativeName: 'Bahasa Melayu', region: 'Malaysia' },
  { slug: 'filipino', name: 'Filipino', nativeName: 'Filipino', region: 'Philippines' },
];

export const getLanguageBySlug = (slug: string): SEOLanguage | undefined =>
  SEO_LANGUAGES.find((l) => l.slug === slug);

export const getNonEnglishLanguages = (): SEOLanguage[] =>
  SEO_LANGUAGES.filter((l) => l.slug !== 'english');
