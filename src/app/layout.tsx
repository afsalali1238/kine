import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Chrome } from './Chrome';

export const metadata: Metadata = {
  title: 'kinē — move without guessing',
  description:
    'A 3D-guided recovery plan: place the pain on your own body, answer seven questions, and ' +
    'get a dose you can actually keep up.',
  applicationName: 'kinē',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f6f4ee',
  viewportFit: 'cover',
};

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
