import type { Metadata } from 'next';
import Rack from '@/components/Rack';
import { socialMetadata } from '@/lib/social-metadata';

export const metadata: Metadata = socialMetadata({
  title: 'ostra — a modular playground',
  description:
    'A modular synthesiser in your browser. Patch cables, explore colourful modules and build your own musical instrument.',
  path: '/',
  image: 'home',
  alt: 'The Ostra logo above amber, green and coral synthesiser modules connected by patch cables on a dark green background.',
});

export default function Page() {
  return <Rack />;
}
