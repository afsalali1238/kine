import type { StringTable } from '../i18n';

/**
 * Triage, the reasoning card and the plan screen.
 */
export const CLINICAL: StringTable = {
  'triage.urgent.title': ['Before we start', 'قبل أن نبدأ'],
  'triage.urgent.body': [
    'What you have described needs medical assessment today. Reading the explanation is fine; ' +
      'starting exercises is not.',
    'ما وصفته يحتاج تقييمًا طبيًا اليوم. قراءة الشرح مقبولة، لكن بدء التمارين ليس كذلك.',
  ],
  'triage.review.title': ['Worth an in-person look', 'يستحق فحصًا مباشرًا'],
  'triage.review.body': [
    'A few answers are worth getting checked. Your programme is still safe to start, and a clinician can refine it.',
    'بعض الإجابات تستحق الفحص. برنامجك آمن للبدء، ويستطيع المختص تحسينه.',
  ],
  'triage.read': ['Read the explanation', 'اقرأ الشرح'],
  'triage.emergency': ['Emergency help', 'طلب طوارئ'],
  'triage.close': ['I understand', 'أفهم'],

  'explain.title': ['This looks most like', 'أقرب ما يشبه ذلك'],
  'explain.secondary': ['Also possible', 'محتمل أيضًا'],
  'explain.fit': ['pattern fit', 'مطابقة النمط'],
  'explain.fitNote': [
    'These are pattern-fit scores, not probabilities. Nothing here is a diagnosis.',
    'هذه درجات مطابقة نمط، وليست احتمالات. لا شيء هنا تشخيص.',
  ],
  'explain.notLikeMe': ['That does not sound like me', 'هذا لا يشبه حالتي'],
  'explain.rerank': ['Show the next possibility', 'اعرض الاحتمال التالي'],
  'explain.backToQuestions': ['Answer the movement questions again', 'أجب عن أسئلة الحركة مجددًا'],
  'explain.start': ['Build my programme', 'ابنِ برنامجي'],

  'plan.title': ['Your programme', 'برنامجك'],
  'plan.phase': ['Phase {n}', 'المرحلة {n}'],
  'plan.phase1': ['Calm it down', 'تهدئة'],
  'plan.phase2': ['Load it', 'تحميل'],
  'plan.phase3': ['Build capacity', 'بناء القدرة'],
  'plan.minutes': ['{n} minutes, {n2} exercises', '{n} دقائق، {n2} تمرينًا'],
  'plan.frequency': ['{n}× per week', '{n} مرات في الأسبوع'],
  'plan.character': ['Programme character', 'طابع البرنامج'],
  'plan.why': ['Why these four', 'لماذا هذه الأربعة'],
  'plan.goal': ['Your goal', 'هدفك'],
  'plan.goalPlaceholder': [
    'Carry my daughter, sit through a meeting, run again…',
    'حمل ابنتي، الجلوس في اجتماع، الجري مجددًا…',
  ],
  'plan.start': ['Start today', 'ابدأ اليوم'],
  'plan.print': ['Print my programme', 'اطبع برنامجي'],
  'plan.locked': [
    'This pattern is protected: strengthening stays switched off until it settles.',
    'هذا النمط محمي: التقوية تبقى موقوفة حتى يهدأ.',
  ],
};
