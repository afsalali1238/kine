import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  tone?: 'default' | 'pale';
  className?: string;
  as?: 'div' | 'section' | 'article';
  testid?: string;
};

/** The one container the app uses: header row, body, optional actions. */
export function Card({
  children,
  eyebrow,
  title,
  actions,
  tone = 'default',
  className = '',
  as: Tag = 'section',
  testid,
}: Props) {
  return (
    <Tag className={`card ${tone === 'pale' ? 'card-flat' : ''} ${className}`} data-testid={testid}>
      {(eyebrow || title || actions) && (
        <div className="row row-between">
          <div className="stack stack-sm">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            {title ? typeof title === 'string' ? <h2>{title}</h2> : title : null}
          </div>
          {actions ? <div className="row row-tight">{actions}</div> : null}
        </div>
      )}
      {children}
    </Tag>
  );
}
