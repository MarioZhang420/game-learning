import type { Lesson } from '@game-learning/content';

type SectionKind = Lesson['sections'][number]['kind'];

const LABELS: Record<string, Record<SectionKind, string>> = {
  ar: {
    hook: '🤔 فكّر معي',
    explain: '📖 لنفهم',
    example: '🔍 مثال',
    'picture-this': '🎨 تخيّل',
    remember: '🧠 تذكّر',
    'did-you-know': '💡 هل تعلم؟',
    'try-it': '✋ جرّب بنفسك',
    summary: '⭐ الخلاصة',
  },
  en: {
    hook: '🤔 Think about it',
    explain: '📖 Let’s understand',
    example: '🔍 Example',
    'picture-this': '🎨 Picture this',
    remember: '🧠 Remember',
    'did-you-know': '💡 Did you know?',
    'try-it': '✋ Try it',
    summary: '⭐ Summary',
  },
};

const KEY_WORDS: Record<string, string> = { ar: 'كلمات مهمة', en: 'Key words' };

/** Renders a lesson as Markdown for reading and review. Fact ids are kept as HTML comments. */
export function renderLesson(lesson: Lesson, language: string): string {
  const lang = language.split('-')[0] ?? 'en';
  const labels = LABELS[lang] ?? LABELS.en;
  const out: string[] = [];
  if (lang === 'ar') out.push('<div dir="rtl">', '');
  out.push(`# ${lesson.title}`, '');
  for (const section of lesson.sections) {
    const label = labels?.[section.kind] ?? section.kind;
    out.push(`## ${label}${section.title ? `: ${section.title}` : ''}`);
    out.push(`<!-- facts: ${section.factIds.join(', ')} -->`, '', section.body.trim(), '');
  }
  if (lesson.keyWords.length) {
    out.push(`## ${KEY_WORDS[lang] ?? KEY_WORDS.en}`, '');
    for (const k of lesson.keyWords) out.push(`- **${k.term}**: ${k.meaning}`);
    out.push('');
  }
  if (lang === 'ar') out.push('</div>', '');
  return out.join('\n');
}
