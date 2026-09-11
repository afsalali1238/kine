/**
 * Pain-school readings, migrated verbatim from v1 (English, plus the Arabic v1 already
 * reviewed). Education about pain, not advice about a body part: presentation-specific
 * prose lives in presentations.json.
 */

export type Article = {
  id: string;
  icon: 'heart' | 'footprints' | 'scan' | 'activity';
  title: string;
  titleAr: string;
  tag: string;
  tagAr: string;
  body: string;
  bodyAr: string;
};

export const ARTICLES: Article[] = [
  {
    id: 'hurt-harm',
    icon: 'heart',
    title: 'Hurt doesn’t always mean harm.',
    titleAr: 'الألم لا يعني دائماً الضرر.',
    tag: 'UNDERSTANDING PAIN',
    tagAr: 'فهم الألم',
    body:
      'Pain is real, but it is not a precise damage meter. The nervous system can become more ' +
      'protective after an injury or a long period of discomfort. Comfortable, repeatable ' +
      'movement helps it learn that you can move safely. New or worsening neurological symptoms ' +
      'are different: stop and get assessed.',
    bodyAr:
      'الألم حقيقي لكنه ليس مقياساً دقيقاً للضرر. قد يصبح الجهاز العصبي أكثر حماية بعد الإصابة. ' +
      'تساعد الحركة المريحة المتكررة على استعادة الثقة. أوقف التمرين واطلب تقييماً عند ظهور أعراض ' +
      'عصبية جديدة أو متفاقمة.',
  },
  {
    id: 'not-fragile',
    icon: 'footprints',
    title: 'Your back is not fragile.',
    titleAr: 'ظهرك ليس هشّاً.',
    tag: 'MOVEMENT CONFIDENCE',
    tagAr: 'الثقة بالحركة',
    body:
      'Your spine is built to bend, turn, and carry load. There is no single perfect posture, and ' +
      'changing position often matters more than sitting perfectly. Start with a movement that ' +
      'feels manageable, repeat it, and expand your range as confidence grows.',
    bodyAr:
      'عمودك الفقري مصمّم للانحناء والدوران وتحمل الأحمال. لا توجد وضعية مثالية واحدة. تغيير ' +
      'الوضعية أهم من الجلوس المثالي. ابدأ بحركة مناسبة وزد النطاق تدريجياً.',
  },
  {
    id: 'scan-story',
    icon: 'scan',
    title: 'A scan is not the whole story.',
    titleAr: 'الصورة ليست القصة كاملة.',
    tag: 'PUTTING THINGS IN PERSPECTIVE',
    tagAr: 'وضع الأمور في سياقها',
    body:
      'Changes such as disc bulges and joint wear are common in people who have no pain at all. ' +
      'Imaging is useful for specific clinical questions, but it does not determine your future. ' +
      'How you move, sleep, recover and gradually load your body matters too.',
    bodyAr:
      'تغيّرات مثل بروز الأقراص شائعة لدى أشخاص دون ألم. التصوير مفيد لأسئلة محددة لكنه لا يحدّد ' +
      'مستقبلك. الحركة والنوم والتعافي والحمل التدريجي مهمة أيضاً.',
  },
  {
    id: 'own-traffic-light',
    icon: 'activity',
    title: 'Your own traffic light for movement.',
    titleAr: 'إشارتك الخاصة للحركة.',
    tag: 'EVERYDAY SELF-MANAGEMENT',
    tagAr: 'إدارة يومية ذاتية',
    body:
      'Green: discomfort up to 4/10, settling within 24 hours, and no worse the next morning. ' +
      'Amber: the next-day response is not known yet — keep the dose steady and check in ' +
      'tomorrow. Red: pain above 4/10, symptoms that linger beyond a day, or a worse morning — ' +
      'ease off or swap down. New weakness or spreading numbness needs assessment.',
    bodyAr:
      'أخضر: ألم حتى ٤/١٠ يهدأ خلال ٢٤ ساعة وليس أسوأ صباحاً. كهرماني: استجابة الغد غير معروفة، ' +
      'حافظ على الجرعة. أحمر: ألم فوق ٤/١٠ أو مستمر أو أسوأ صباحاً، خفف الحمل. الضعف الجديد ' +
      'والخدر الممتد يحتاجان تقييماً.',
  },
];

export const READ_TIME_LABEL = '2 min read';
