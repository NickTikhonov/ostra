# Social cards

`Card.tsx` is the design source for `public/social/home.png` and `learn.png`.
It renders the real module panels and static cables without mounting the audio engine.
The images are 1200 × 630 PNGs, shared by Open Graph and Twitter metadata.

To regenerate after changing the design:

1. Temporarily create `src/app/social-preview/[card]/page.tsx`:

   ```tsx
   import Card from '../../../../scripts/social-cards/Card';

   export function generateStaticParams() {
     return [{ card: 'home' }, { card: 'learn' }];
   }

   export default async function Page({ params }: { params: Promise<{ card: string }> }) {
     const { card } = await params;
     return <Card learn={card === 'learn'} />;
   }
   ```

2. Run `npm run dev` and open `/social-preview/home` and `/social-preview/learn`
   in a browser with a 1200 × 630 viewport. Wait for the local fonts to render.
3. Capture each viewport to its corresponding PNG in `public/social/`.
   If the browser captures at a higher device pixel ratio, resize to 1200 × 630.
4. Remove the temporary route before building or deploying. Verify image dimensions
   and the page-specific `og:image` and `twitter:image` tags in the exported HTML.

Keep essential text away from the edges; platforms may crop previews differently.
