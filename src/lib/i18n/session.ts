import type { StringTable } from '../i18n';

/**
 * The player, the metronome and the traffic light.
 */
export const SESSION: StringTable = {
  'session.set': ['Set {n} of {total}', 'المجموعة {n} من {total}'],
  'session.rep': ['Rep {n} of {total}', 'التكرار {n} من {total}'],
  'session.hold': ['Hold {n}s', 'اثبت {n} ثانية'],
  'session.rest': ['Rest {n}s', 'استرح {n} ثانية'],
  'session.play': ['Play', 'تشغيل'],
  'session.pause': ['Pause', 'إيقاف مؤقت'],
  'session.front': ['Front', 'أمام'],
  'session.side': ['Side', 'جانب'],
  'session.reset': ['Reset view', 'أعد ضبط المنظر'],
  'session.showMistake': ['Show the common mistake', 'أظهر الخطأ الشائع'],
  'session.hideMistake': ['Hide the mistake', 'أخفِ الخطأ'],
  'session.mistakeLabel': ['Common mistake', 'خطأ شائع'],
  'session.you': ['You', 'أنت'],
  'session.cues': ['Cues', 'إرشادات'],
  'session.done': ['Done — next exercise', 'تم — التمرين التالي'],
  'session.finish': ['Finish session', 'أنهِ الجلسة'],
  'session.painful': ['Too painful', 'مؤلم جدًا'],
  'session.tooEasy': ['Too easy', 'سهل جدًا'],
  'session.skip': ['Skip', 'تخطٍّ'],
  'session.why.hurts': ['Hurts', 'يؤلم'],
  'session.why.position': ["Can't get into position", 'لا أستطيع الوصول للوضعية'],
  'session.why.equipment': ['No equipment', 'الأداة غير متوفرة'],
  'session.why.time': ['No time', 'لا وقت'],
  'session.swapped': [
    'Swapped to the easier version, and the next session will be lighter.',
    'استُبدل بالنسخة الأسهل، وستكون الجلسة القادمة أخف.',
  ],
  'session.offered': [
    'The harder version is queued for your next session — never mid-set.',
    'النسخة الأصعب مؤجلة لجلستك القادمة — وليس في منتصف المجموعة.',
  ],
  'session.remaining': ['{n} left today', 'بقي {n} اليوم'],
  'session.affordance': [
    'Move with the figure; copy the tempo you see.',
    'تحرّك مع الشكل، وقلّد السرعة التي تراها.',
  ],
  'session.painPrompt': ['Pain during that set?', 'كم الألم أثناء هذه المجموعة؟'],
  'session.muted': ['Voice off', 'الصوت متوقف'],
  'session.voice': ['Voice on', 'الصوت يعمل'],

  'light.title': ['The 4 / 24 / morning rule', 'قاعدة ٤ / ٢٤ / الصباح'],
  'light.during': [
    'Up to 4 out of 10 while you move is acceptable.',
    'حتى ٤ من ١٠ أثناء الحركة مقبول.',
  ],
  'light.settle': ['It must settle back within 24 hours.', 'لازم أن يهدأ خلال ٢٤ ساعة.'],
  'light.morning': [
    'And it must not be worse the morning after.',
    'وألا يكون أسوأ في صباح اليوم التالي.',
  ],
  'light.note': [
    'This is a load-monitoring rule, not permission to push through anything.',
    'هذه قاعدة لمراقبة الحمل، وليست إذنًا بالتحمل بأي شكل.',
  ],
  'light.neuro': [
    'New or worsening numbness, tingling or weakness overrides all of this — stop and get it looked at.',
    'أي خدر أو تنميل أو ضعف جديد أو متزايد يلغي كل هذا — توقف وافحصه.',
  ],
  'light.green': ['Within the rule', 'ضمن القاعدة'],
  'light.amber': ['Watch it', 'راقبه'],
  'light.red': ['Ease off', 'خفّف الحمل'],
};
