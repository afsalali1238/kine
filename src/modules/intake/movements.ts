/**
 * Movement vocabulary for the aggravating/easing question.
 *
 * v1 hard-coded one list per body group. v2 derives the list from the matching rules of
 * the presentations a region can reach (see `rule-index.ts`), so every chip on screen is
 * a chip that can actually change the ranking. The Arabic below is plain movement
 * language for the intake chrome, which the brief requires to be translated properly;
 * it is proofed against v1's reviewed labels where v1 had them.
 */

export type Lang = 'en' | 'ar';
export type MovementLabel = { en: string; ar: string };

export const MOVEMENTS: Record<string, MovementLabel> = {
  bending: { en: 'Bending forward', ar: 'الانحناء للأمام' },
  arching: { en: 'Arching back', ar: 'تقويس الظهر' },
  sitting: { en: 'Sitting for more than 20 minutes', ar: 'الجلوس أكثر من ٢٠ دقيقة' },
  standing: { en: 'Standing still', ar: 'الوقوف ثابتًا' },
  walking: { en: 'Walking', ar: 'المشي' },
  lifting: { en: 'Lifting something', ar: 'رفع شيء' },
  carrying: { en: 'Carrying a load', ar: 'حمل شيء ثقيل' },
  'one-leg': { en: 'Standing on one leg', ar: 'الوقوف على ساق واحدة' },
  turning: { en: 'Turning my head', ar: 'الالتفات بالرأس' },
  desk: { en: 'Working at a desk', ar: 'العمل المكتبي' },
  headache: { en: 'Headache with neck movement', ar: 'صداع مع حركة الرقبة' },
  overhead: { en: 'Reaching overhead', ar: 'الوصول فوق الرأس' },
  'looking-up': { en: 'Looking up', ar: 'النظر للأعلى' },
  dressing: { en: 'Getting dressed', ar: 'ارتداء الملابس' },
  'stiff-all': { en: 'Stiff in every direction', ar: 'تيبس في كل الاتجاهات' },
  'cross-body': { en: 'Reaching across my body', ar: 'مد الذراع عبر الجسم' },
  'side-lying': { en: 'Lying on my side', ar: 'النوم على الجانب' },
  'behind-back': { en: 'Reaching behind my back', ar: 'الوصول خلف الظهر' },
  blade: { en: 'Between the shoulder blades', ar: 'بين لوحي الكتف' },
  stairs: { en: 'Stairs', ar: 'الدرج' },
  squatting: { en: 'Squatting', ar: 'القرفصاء' },
  running: { en: 'Running', ar: 'الجري' },
  jumping: { en: 'Jumping', ar: 'القفز' },
  hop: { en: 'Hopping', ar: 'القفز على ساق واحدة' },
  twisting: { en: 'Twisting', ar: 'الالتواء' },
  'deep-bend': { en: 'Deep bending', ar: 'الانحناء العميق' },
  'below-kneecap': { en: 'Pain below the kneecap', ar: 'ألم تحت صابونة الركبة' },
  'outside-knee': { en: 'Pain on the outside of the knee', ar: 'ألم في الجانب الخارجي للركبة' },
  'first-steps': { en: 'The first few steps', ar: 'أول خطوات بعد الوقوف' },
  'sit-beyond-90': {
    en: 'Sitting with the hip bent past 90 degrees',
    ar: 'الجلوس مع ثني الورك أكثر من ٩٠ درجة',
  },
  'heel-raise': { en: 'Rising onto my toes', ar: 'رفع الكعب على أصابع القدم' },
  barefoot: { en: 'Walking barefoot', ar: 'المشي بدون حذاء' },
  'stiff-toe': { en: 'Stiffness in the big toe', ar: 'تيبس في إبهام القدم' },
  gripping: { en: 'Gripping', ar: 'القبض باليد' },
  pinching: { en: 'Pinching', ar: 'القرص بالأصابع' },
  pulling: { en: 'Pulling', ar: 'السحب' },
  pushing: { en: 'Pushing', ar: 'الدفع' },
  'wrist-flexion': { en: 'Bending my wrist', ar: 'ثني الرسغ' },
  thumb: { en: 'Moving my thumb', ar: 'تحريك الإبهام' },
  'grip-fall': { en: 'My grip gives way', ar: 'قبضة يدي تخذلني' },
  dropping: { en: 'Dropping things', ar: 'سقوط الأشياء من يدي' },
  reaching: { en: 'Reaching out', ar: 'مد الذراع' },
  pressing: { en: 'Pressing on the sore spot', ar: 'الضغط على الموضع المؤلم' },
  'groin-push': { en: 'A pushing feeling in the groin', ar: 'ضغط أو شد في الأربية' },
  cough: { en: 'Coughing or sneezing', ar: 'السعال أو العطس' },
  breathing: { en: 'Deep breathing', ar: 'التنفس العميق' },
  lying: { en: 'Lying down', ar: 'الاستلقاء' },
  movement: { en: 'Moving around', ar: 'التحرك والتمدد' },
  rest: { en: 'Resting', ar: 'الراحة' },
  incident: { en: 'It started in one moment', ar: 'بدأ في لحظة واحدة' },
  'weight-bearing': { en: 'Bearing weight on it', ar: 'الحمل على المنطقة' },
  straightening: { en: 'Straightening the joint', ar: 'فرد المفصل' },
  locking: { en: 'It catches or locks', ar: 'يعلق أو يُقفل' },
  swelling: { en: 'Visible swelling', ar: 'تورّم ظاهر' },
  loose: { en: 'It feels loose', ar: 'أشعر بأنه غير ثابت' },
  arm: { en: 'Into my arm or hand', ar: 'إلى الذراع أو اليد' },
  leg: { en: 'Into my leg', ar: 'إلى الساق' },
  neck: { en: 'Into my neck', ar: 'إلى الرقبة' },
  tingling: { en: 'Tingling', ar: 'تنميل' },
  'numb-foot': { en: 'Numbness in the foot', ar: 'خدر في القدم' },
  'both-legs': { en: 'Into both legs', ar: 'إلى الساقين' },
  saddle: { en: 'Numb around my seat or groin', ar: 'خدر حول المقعد أو الأربية' },
  bladder: { en: 'New bladder or bowel changes', ar: 'تغيّرات جديدة في المثانة أو الأمعاء' },
  weakness: { en: 'Weakness that is getting worse', ar: 'ضعف يزداد' },
  fever: { en: 'Fever or feeling unwell', ar: 'حمى أو شعور بالمرض' },
  'weight-loss': { en: 'Unexplained weight loss', ar: 'نقص وزن غير مبرر' },
  'major-trauma': {
    en: 'A major impact — a fall or collision',
    ar: 'إصابة شديدة — سقوط أو اصطدام',
  },
  chest: { en: 'Chest pain or breathlessness', ar: 'ألم في الصدر أو ضيق تنفس' },
  'severe-headache': { en: 'A first, sudden, severe headache', ar: 'أول صداع مفاجئ وشديد' },
};

export function movementLabel(key: string, lang: Lang): string {
  const entry = MOVEMENTS[key];
  if (!entry) return key.replace(/-/g, ' ');
  return lang === 'ar' ? entry.ar : entry.en;
}

export const NEURO_DETAILS: Record<string, string[]> = {
  'lower-back': ['leg', 'both-legs', 'saddle', 'bladder', 'weakness'],
  hip: ['leg', 'one-leg', 'weakness'],
  knee: ['locking', 'swelling', 'weight-bearing'],
  neck: ['arm', 'headache', 'severe-headache', 'chest', 'weakness'],
  shoulder: ['arm', 'numb-foot', 'weakness'],
  elbow: ['numb-foot', 'dropping', 'grip-fall'],
  wrist: ['numb-foot', 'dropping', 'grip-fall', 'thumb'],
  ankle: ['swelling', 'weight-bearing', 'numb-foot'],
  foot: ['swelling', 'weight-bearing', 'numb-foot'],
};

export const URGENT_DETAILS = ['bladder', 'saddle', 'both-legs', 'chest', 'severe-headache'];
export const REVIEW_DETAILS = [
  'weakness',
  'weight-loss',
  'fever',
  'major-trauma',
  'locking',
  'weight-bearing',
];
