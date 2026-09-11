import { ARABIC_PLACEHOLDER_PENDING } from '@/lib/i18n';

/**
 * Renders a content string that has no Arabic yet. It shows the English source and a
 * visible marker — an invented placeholder is the failure mode this exists to prevent.
 */
export function PendingTranslation({ text, pending }: { text: string; pending: boolean }) {
  if (!pending) return <>{text}</>;
  return (
    <>
      {text}{' '}
      <span className="pill pill-warn xs" data-testid="pending-translation">
        {ARABIC_PLACEHOLDER_PENDING}
      </span>
    </>
  );
}
