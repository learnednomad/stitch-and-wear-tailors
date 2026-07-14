# Storefront seed photography

The PocketBase seed script uploads files from this directory when they exist and
otherwise leaves the image fields empty. The storefront renders intentional tonal
fallbacks for empty image fields.

All photography should be original, text-free, logo-free and watermark-free, with
warm low-key lighting, honest fabric texture, deep brown/black backdrops and muted
antique-gold accents. Keep skin texture natural and avoid copying identifiable
people from the visual reference.

## Required filenames

- `hero-home.webp`, `hero-about.webp`
- `product-01.webp` through `product-12.webp` (same order as `PRODUCTS` in the seed script)
- `tailor-01.webp` through `tailor-06.webp` (4:5 portraits)
- `tailor-01-cover.webp` through `tailor-06-cover.webp` (3:1 atelier scenes)
- `collection-agbada-heritage.webp`
- `collection-modern-womenswear.webp`
- `collection-finishing-touches.webp`
- `collection-textiles-of-west-africa.webp`
- `journal-story-behind-agbada.webp`
- `journal-choosing-the-perfect-fabric.webp`
- `journal-wedding-style-inspiration.webp`
- `journal-bespoke-versus-ready-to-wear.webp`

## Generation prompt set

Use case: `photorealistic-natural` for people/editorial scenes and `product-mockup`
for isolated garments. Asset type: luxury Nigerian fashion storefront photography.
Style: contemporary editorial photography, warm directional studio light, deep
charcoal environment, subtle bronze highlights, tactile cloth, restrained styling.
Constraints: Nigerian subjects and craft context; culturally accurate tailoring;
no copied identity; no logos, text, watermark, fantasy costume, plastic skin or
exaggerated gold props.

- Home hero: full-length man in a midnight-blue embroidered agbada, quiet atelier,
  subject placed right with generous dark negative space left, 3:2 landscape.
- About hero: four Nigerian craftspeople cutting and hand-finishing cloth around a
  shared worktable, candid collaborative moment, 3:1 landscape.
- Products: one garment/accessory from the matching seed record, full silhouette,
  premium dark studio backdrop, 4:5 portrait, consistent camera and light.
- Tailor portraits: confident maker in their working environment, waist-up or
  seated, direct but natural expression, 4:5 portrait.
- Tailor covers: hands, tools and workshop context for the same maker, no face
  required, ample dark negative space, 3:1 landscape.
- Collections: small editorial grouping that clearly communicates the collection
  subject, atmospheric but legible, 4:5 portrait.
- Journal: documentary detail or fitting scene matching the article title,
  composed for a landscape card crop, 3:2 landscape.
