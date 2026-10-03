import type { Metadata } from 'next';
import Rack from '@/components/Rack';
import { socialMetadata } from '@/lib/social-metadata';

export const metadata: Metadata = socialMetadata({
  title: 'Learn modular synthesis — ostra',
  description:
    'Learn how to program a modular synthesiser in your browser with an interactive, hands-on tutorial.',
  path: '/learn',
  image: 'learn',
  alt: 'The Ostra logo above colourful synthesiser modules, with an oscillator patched into a filter on a warm cream background.',
});

export default function LearnPage() {
  return <Rack tutorial />;
}
