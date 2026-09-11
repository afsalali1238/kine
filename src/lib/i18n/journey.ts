import type { StringTable } from '../i18n';

/**
 * Check-in, progress, learning, handout and the animator.
 */
export const JOURNEY: StringTable = {
  'checkin.daily': ['How is the pain today?', 'كيف الألم اليوم؟'],
  'checkin.better': ['Better', 'أحسن'],
  'checkin.same': ['Same', 'مماثل'],
  'checkin.worse': ['Worse', 'أسوأ'],
  'checkin.saved': ['Saved', 'تم الحفظ'],
  'checkin.post.title': ['15 seconds, then you are done', '١٥ ثانية ثم تنتهي'],
  'checkin.post.felt': ['How did that feel?', 'كيف كان الشعور؟'],
  'checkin.easy': ['Easy', 'سهل'],
  'checkin.right': ['About right', 'مناسب'],
  'checkin.hard': ['Hard', 'صعب'],
  'checkin.next.title': ['The morning after', 'صباح اليوم التالي'],
  'checkin.next.body': [
    'Did yesterday settle by now, and was this morning worse than usual?',
    'هل هدأ أمس حتى الآن، وهل كان صباح اليوم أسوأ من المعتاد؟',
  ],
  'checkin.next.settled': ['It settled', 'هدأ'],
  'checkin.next.notSettled': ['Still irritated', 'ما زال متهيّجًا'],
  'checkin.next.morningWorse': ['Morning was worse', 'الصباح كان أسوأ'],
  'checkin.next.morningSame': ['Morning was the same or better', 'الصباح مماثل أو أفضل'],

  'progress.title': ['Your trend', 'اتجاهك'],
  'progress.pain': ['Pain', 'الألم'],
  'progress.adherence': ['Sessions done', 'الجلسات المنجزة'],
  'progress.phases': ['Phase history', 'تاريخ المراحل'],
  'progress.map': ['Pain map over time', 'خريطة الألم عبر الزمن'],
  'progress.week': ['Week', 'أسبوع'],
  'progress.weeks': ['weeks', 'أسابيع'],
  'progress.sessions': ['sessions', 'جلسات'],
  'learn.offline': [
    'Everything is stored on this device only. Export a JSON copy before clearing the browser.',
    'كل شيء محفوظ على هذا الجهاز فقط. صدّر نسخة JSON قبل مسح المتصفح.',
  ],
  'progress.needSessions': [
    'More sessions are needed in this review block',
    'جلسات إضافية مطلوبة في مجموعة المراجعة',
  ],
  'progress.trendUp': [
    'The pain trend is rising — hold or reduce before advancing',
    'اتجاه الألم صاعد — ثبّت أو خفّف قبل الترقية',
  ],
  'progress.noSession': [
    'No session logged in this block yet',
    'لا توجد جلسة مسجلة في هذه المجموعة',
  ],
  'progress.effort': [
    'The last session felt harder than expected',
    'الجلسة الأخيرة كانت أصعب من المتوقع',
  ],
  'progress.nextDayPending': [
    'The next-morning check is still open',
    'فحص صباح اليوم التالي لم يكتمل',
  ],
  'progress.nextDayFailed': [
    'Symptoms did not settle, or the morning was worse',
    'لم يهدأ العرض أو كان الصباح أسوأ',
  ],
  'progress.empty': [
    'Nothing logged yet. Finish a session and this fills in.',
    'لا شيء بعد. أنهِ جلسة ويكتمل هذا.',
  ],
  'progress.adapt': [
    'Your pain has dropped from {from} to {to}, and you have completed {done} of {total} sessions — {change}',
    'انخفض ألمك من {from} إلى {to}، وأكملت {done} من {total} جلسات — {change}',
  ],
  'progress.adding': [
    'adding two strengthening exercises this week.',
    'نضيف تمرينَي تقوية هذا الأسبوع.',
  ],
  'progress.holding': ['holding the dose so the trend can settle.', 'نثبّت الجرعة ليهدأ الاتجاه.'],
  'progress.reducing': ['reducing the dose for a week.', 'نخفّض الجرعة لأسبوع.'],
  'progress.review': ['Review gate', 'بوابة المراجعة'],
  'progress.reviewBody': [
    '{done} of {need} sessions in this block. Progression needs {done} done, a flat or falling ' +
      'trend, manageable effort and a clear next-day check — not a date on the calendar.',
    '{done} من {need} جلسات في هذه المجموعة. الترقية تحتاج إتمام الجلسات، واتجاهًا ثابتًا أو ' +
      'نازلاً، وجهدًا محتملًا، وفحصًا نظيفًا في اليوم التالي — لا تاريخًا في التقويم.',
  ],
  'progress.advance': ['Advance to phase {n}', 'انتقل إلى المرحلة {n}'],
  'progress.notYet': ['Not yet — {n} more session(s)', 'ليس بعد — {n} جلسة إضافية'],
  'progress.hold': ['Stay in this phase', 'ابقَ في هذه المرحلة'],

  'learn.title': ['Understand it', 'تفهّمه'],
  'learn.belief1': ['Hurt is not the same as harm.', 'الألم ليس يعني الضرر.'],
  'learn.belief2': [
    'Movement is safe, even when it is uncomfortable.',
    'الحركة آمنة حتى مع الانزعاج.',
  ],
  'learn.belief3': ['Your back is not fragile.', 'ظهرك ليس هشًا.'],
  'learn.belief4': [
    'Scans show changes in plenty of people with no pain.',
    'التصوير يُظهر تغيّرات عند كثيرين بلا ألم.',
  ],
  'learn.watch': ['What to watch for', 'ما يجب ملاحظته'],
  'learn.course': ['What to expect', 'ما يمكن توقعه'],
  'learn.helps': ['What actually helps', 'ما يساعد فعلاً'],
  'learn.why': ['Why this helps', 'لماذا يفيد هذا'],
  'learn.noEquipment': ['No equipment', 'دون أدوات'],
  'learn.read': ['Read it', 'اقرأها'],
  'learn.close': ['Close', 'إغلاق'],

  'handout.title': ['Programme handout', 'ورقة البرنامج'],
  'animator.tracks': ['Tracks', 'المسارات'],
  'animator.cues': ['Cues', 'الإرشادات'],
  'animator.save': ['Save draft', 'حفظ كمسودة'],
  'animator.publish': ['Mark reviewed', 'تعليم كمراجعة'],
  'animator.hint': [
    'Angles are checked against the pattern range on every change.',
    'تُقارن الزوايا بحدود نطاق النمط عند كل تعديل.',
  ],
  'animator.audio': ['Audio key', 'مفتاح الصوت'],
  'animator.beat': ['No audio yet', 'لا صوت بعد'],
  'checkin.reset': ['Discard edit', 'تجاهل التعديل'],
  'handout.print': ['Print', 'اطبع'],
  'handout.foot': [
    'Start with exercise one. Up to 4/10 while moving is acceptable, it must settle within 24 ' +
      'hours, and the next morning must not be worse.',
    'ابدأ بالتمرين الأول. حتى ٤ من ١٠ أثناء الحركة مقبول، ويجب أن يهدأ خلال ٢٤ ساعة، وألا يكون الصباح أسوأ.',
  ],
  'handout.frames': ['Start → position → finish', 'البداية ← الوضعية ← النهاية'],
  'handout.frame1': ['Start', 'البداية'],
  'handout.frame2': ['Position', 'الوضعية'],
  'handout.frame3': ['Return', 'العودة'],
  'handout.dose': ['{sets} sets of {reps}, slowly', '{sets} مجموعات × {reps}، ببطء'],
  'handout.hold': ['{sets} holds of {seconds}s', '{sets} تثبيتات × {seconds} ثانية'],

  'ui.pending': ['translation pending', 'الترجمة قيد المراجعة'],
  'ui.unsigned': ['clinician sign-off pending', 'بانتظار اعتماد المختص'],
  'ui.internal': [
    'Internal testing · content not yet clinically reviewed',
    'تختبر داخليًا — المحتوى لم يُراجع سريريًا بعد',
  ],
  'ui.close': ['Close', 'إغلاق'],
  'ui.language': ['العربية', 'English'],
  'ui.demo': ['Load a sample week', 'حمّل أسبوعًا تجريبيًا'],
  'ui.reset': ['Start over', 'ابدأ من جديد'],
  'ui.today': ['Today', 'اليوم'],
  'ui.nothing': ['Nothing for this area yet', 'لا شيء لهذا الموضع بعد'],
};
