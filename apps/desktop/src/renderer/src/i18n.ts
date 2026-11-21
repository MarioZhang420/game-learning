// UI text. The question itself comes in the pack's language; the frame around it follows it.
const strings = {
  ar: {
    died: 'سقطتَ! أجب لتكسب مكافأة',
    rested: 'استراحة! سؤال سريع',
    generic: 'سؤال',
    true: 'صح',
    false: 'خطأ',
    correct: 'أحسنت! إجابة صحيحة',
    wrong: 'ليست صحيحة، لا بأس',
    rightAnswer: 'الإجابة الصحيحة',
    reward: 'المكافأة',
    later: 'لاحقاً',
    continue: 'متابعة',
    keys: 'اضغط رقم الإجابة على لوحة المفاتيح، أو انقر',
    xp: 'نقطة خبرة',
    'currency.grant': 'جيو',
    'health.restore': 'صحة',
    applied: 'وصلت إلى اللعبة ✓',
    failed: 'لم تصل إلى اللعبة',
    rejected: 'رفضتها اللعبة',
    streak: 'متتالية',
  },
  en: {
    died: 'You fell! Answer to earn a reward',
    rested: 'Rest stop! Quick question',
    generic: 'Question',
    true: 'True',
    false: 'False',
    correct: 'Well done! Correct',
    wrong: 'Not quite, that’s okay',
    rightAnswer: 'Right answer',
    reward: 'Reward',
    later: 'Later',
    continue: 'Continue',
    keys: 'Press the answer number on your keyboard, or click',
    xp: 'XP',
    'currency.grant': 'Geo',
    'health.restore': 'health',
    applied: 'arrived in the game ✓',
    failed: 'did not reach the game',
    rejected: 'the game refused it',
    streak: 'streak',
  },
} as const;

export type StringKey = keyof (typeof strings)['en'];

export function t(language: string, key: StringKey | string): string {
  const table: Record<string, string> = language.startsWith('ar') ? strings.ar : strings.en;
  return table[key] ?? key;
}

export function reasonText(language: string, reason: string): string {
  if (reason === 'player.died') return t(language, 'died');
  if (reason === 'player.rested') return t(language, 'rested');
  return t(language, 'generic');
}

export const isRtl = (language: string) => /^(ar|fa|he|ur)\b/.test(language);
