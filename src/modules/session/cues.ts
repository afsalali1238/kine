/**
 * Spoken cues. Device speech only — no audio files to ship, no CDN to fetch from, and the
 * Arabic cue is read in `ar` when the voice exists. If the browser has no speech engine the
 * toggle stays visible and simply reports that it is off; nothing pretends to be playing.
 */

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: 'en' | 'ar'): void {
  if (!speechAvailable() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-GB';
    utterance.rate = lang === 'ar' ? 0.92 : 0.95;
    utterance.volume = 0.9;
    const voice = window.speechSynthesis
      .getVoices()
      .find((row) => row.lang.startsWith(lang === 'ar' ? 'ar' : 'en'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is an enhancement; the caption already carried the same line */
  }
}

export function stopSpeech(): void {
  if (!speechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
