import type { StringTable } from '../i18n';

/**
 * The seven questions with their answer labels — the closed vocabulary the brief
 * requires to be correct Arabic, so it is authored here rather than derived.
 */
export const INTAKE: StringTable = {
  'q.intake.intro': [
    'Seven short questions. Your answers change what we prescribe.',
    'سبعة أسئلة قصيرة. إجاباتك تغيّر ما نصفه لك.',
  ],
  'q.intensity.label': ['Pain right now', 'الألم الآن'],
  'q.intensity.now': ['Pain right now', 'الألم الآن'],
  'q.onset.impact': [
    'Was it a significant fall or collision?',
    'هل كان سقوطًا أو اصطدامًا كبيرًا؟',
  ],
  'q.pattern.alongside': [
    'Anything else alongside this? Select only if present.',
    'هل يصاحب ذلك شيء آخر؟ اختر إن وُجد.',
  ],
  'q.intensity.best': ['Best it gets in a day', 'أقل ألم في اليوم'],
  'q.intensity.worst': ['Worst it gets in a day', 'أشد ألم في اليوم'],
  'q.intensity.rule': [
    'The best cannot be higher than the now, or the now higher than the worst.',
    'لا يكون الأقل أعلى من الحالي، ولا الحالي أعلى من الأشد.',
  ],
  'q.onset.label': ['How did it start?', 'كيف بدأ؟'],
  'q.onset.sudden': ['Suddenly, with a specific moment', 'فجأة، في لحظة محددة'],
  'q.onset.gradual': ['Gradually, no clear moment', 'تدريجيًا، بلا لحظة واضحة'],
  'q.onset.incident': ['What happened?', 'ماذا حدث؟'],
  'q.onset.incidentPlaceholder': [
    'Fell off a ladder, twisted it playing…',
    'سقطت، التويت قدمي أثناء اللعب…',
  ],
  'q.duration.label': ['How long has it been going on?', 'منذ متى وهو مستمر؟'],
  'q.duration.under6': ['Under 6 weeks', 'أقل من ٦ أسابيع'],
  'q.duration.6to12': ['6 to 12 weeks', 'بين ٦ و١٢ أسبوعًا'],
  'q.duration.over12': ['More than 3 months', 'أكثر من ٣ أشهر'],
  'q.pattern.label': ['What does the day look like?', 'كيف يسير يومك؟'],
  'q.pattern.morning': ['Worst in the morning, eases as I move', 'الأسوأ صباحًا ويلين مع الحركة'],
  'q.pattern.load': ['Worst with load or at the end of the day', 'الأسوأ مع الحمل أو آخر اليوم'],
  'q.pattern.night': ['It wakes me at night', 'يوقظني في الليل'],
  'q.pattern.constant': ['Much the same all day', 'شبه ثابت طوال اليوم'],
  'q.movements.label': ['What makes it worse?', 'ما الذي يزيده؟'],
  'q.movements.easers': ['What eases it?', 'ما الذي يريحه؟'],
  'q.movements.hint': [
    'Tap once for worse, tap again for better. Pick only one for the same movement.',
    'المس مرة لليزيده، ومرة ثانية ليريحه. لا تختر نفس الحركة للاثنين.',
  ],
  'q.irritability.label': [
    'How easily does it flare, and how long does it last?',
    'بماذا يثور بسهولة وكم يبقى؟',
  ],
  'q.irritability.high': [
    'Very little sets it off, and it lingers for hours',
    'نشاط بسيط يثير الألم، ويستمر ساعات بعده',
  ],
  'q.irritability.moderate': [
    'Moderate amounts aggravate it, it settles within an hour',
    'كميات متوسطة تهيّجه، ويهدأ في خلال ساعة',
  ],
  'q.irritability.low': [
    'It takes quite a lot, and it settles again within minutes',
    'يحتاج إلى نشاط كثير، ويهدأ خلال دقائق',
  ],
  'q.neuro.label': ['Any nerve symptoms?', 'أي أعراض عصبية؟'],
  'q.neuro.none': ['None that I know of', 'لا أعرف شيئًا'],
  'q.neuro.numbness': ['Numbness', 'خدر'],
  'q.neuro.pins': ['Pins and needles', 'تنميل (وخز)'],
  'q.neuro.weakness': [
    'Weakness — things slip from my grip or my leg gives',
    'ضعف — تسقط الأشياء أو تخذل الساق',
  ],
  'q.neuro.travels': ['Where does it travel to?', 'إلى أين يمتد؟'],
  'q.neuro.travels.none': ['Nowhere, it stays put', 'لا يمتد، يبقى في مكانه'],
  'q.back': ['Back', 'رجوع'],
  'q.next': ['Next', 'التالي'],
  'q.skip': ['Skip for now', 'تخطٍّ مؤقتًا'],
  'q.of': ['Question {n} of {total}', 'السؤال {n} من {total}'],
};
