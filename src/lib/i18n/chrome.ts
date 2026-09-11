import type { StringTable } from '../i18n';

/**
 * Shell copy: the brand, the five tabs, the stage strip and the body screen.
 */
export const CHROME: StringTable = {
  'app.name': ['kinē', 'kinē'],
  'app.tagline': ['Move without guessing', 'تحرّك بلا تخمين'],

  'nav.today': ['Today', 'اليوم'],
  'nav.body': ['Body', 'الجسم'],
  'nav.plan': ['Plan', 'خطتك'],
  'nav.progress': ['Progress', 'تقدّمك'],
  'nav.learn': ['Understand', 'تفهّم'],

  'stage.explore': ['Where does it hurt?', 'أين يؤلمك؟'],
  'stage.select': ['Tap the area', 'المس المنطقة'],
  'stage.pinpoint': ['Now the exact spot', 'الآن النقطة الدقيقة'],
  'stage.confirm': ['Is this exactly where it hurts?', 'هل هذا هو مكان الألم تمامًا؟'],
  'stage.intake': ['A few questions', 'أسئلة قليلة'],
  'stage.triage': ['Safety check', 'فحص السلامة'],
  'stage.explain': ['What this looks like', 'بماذا يشبه'],
  'stage.plan': ['Your programme', 'برنامجك'],
  'stage.session': ['Session', 'الجلسة'],
  'stage.review': ['Weekly review', 'المراجعة الأسبوعية'],

  'body.orbit': ['One finger turns, two fingers zoom', 'إصبع للدوران، إصبعان للتكبير'],
  'body.front': ['Front', 'أمام'],
  'body.back': ['Back', 'خلف'],
  'body.male': ['Male', 'ذكر'],
  'body.female': ['Female', 'أنثى'],
  'body.cantFind': ["I can't find it", 'لا أستطيع إيجاده'],
  'body.searchPlaceholder': ['Search a body part', 'ابحث عن جزء من الجسم'],
  'body.yes': ['Yes, that is it', 'نعم، هذا هو'],
  'body.adjust': ['Adjust the marker', 'عدّل العلامة'],
  'body.somewhere': ['Somewhere else', 'مكان آخر'],
  'body.pins': ['{n} of 5 spots', '{n} من ٥ مواضع'],
  'body.intensity': ['How much?', 'كم شدّته؟'],
  'body.removePin': ['Remove this spot', 'أزل هذه النقطة'],
  'body.loading': ['Preparing your body map', 'جارٍ تجهيز خريطة جسمك'],
  'body.noWebgl': [
    'This device cannot show the 3D body, so the body map below works the same way.',
    'لا يمكن لهذا الجهاز عرض الجسم ثلاثي الأبعاد، لذا خريطة الجسم أدناه تعمل بنفس الطريقة.',
  ],
  'body.dragPin': [
    'Drag the marker on the skin to fine-tune it',
    'اسحب العلامة على الجلد للتحديد الدقيق',
  ],
};
