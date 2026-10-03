import type { Metadata } from 'next';

export function socialMetadata({
  title,
  description,
  path,
  image,
  alt,
}: {
  title: string;
  description: string;
  path: string;
  image: 'home' | 'learn';
  alt: string;
}): Metadata {
  const card = { url: `/social/${image}.png`, width: 1200, height: 630, alt, type: 'image/png' };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'ostra',
      locale: 'en_GB',
      title,
      description,
      url: path,
      images: [card],
    },
    twitter: { card: 'summary_large_image', title, description, images: [card] },
  };
}
