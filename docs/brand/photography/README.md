# Faineant brand photography

This directory records the reproducible source prompts and review process for the eight photographs shared by the web and mobile applications.

## Current campaign set

| Asset | Format | Purpose |
| --- | --- | --- |
| `hero.png` | 1536x1024 PNG | Landing, registration, and campaign hero |
| `portrait-maeve.png` | 1024x1536 PNG | Practitioner portrait and generic provider fallback |
| `tile-hair.png` | 1024x1536 PNG | Hair services |
| `tile-nails.png` | 1024x1536 PNG | Nail services |
| `tile-face.png` | 1024x1536 PNG | Facial, brow, and waxing services |
| `tile-lash.png` | 1024x1536 PNG | Lash services |
| `tile-makeup.png` | 1024x1536 PNG | Makeup services |
| `tile-barber.png` | 1024x1536 PNG | Barber, fade, and beard services |

The canonical runtime copies live in:

- `apps/web/public/brand/photography/`
- `apps/mobile/assets/brand/photography/`

Both copies of each filename must remain byte-identical.

## Generation provenance

- Provider: OpenAI API only, using the official `https://api.openai.com/v1` endpoint.
- Model: `gpt-image-2`.
- Operation: Image API edit, with the prior GPT Image 1 photograph supplied as a composition, scene, and palette reference.
- Quality: `high`.
- Output: opaque PNG at the runtime dimensions listed above.
- Prompt source: [`prompts/`](./prompts/).
- Credentials: supply `OPENAI_API_KEY` at runtime from a secret manager. Never place a key in a prompt, command file, repository, test fixture, or documentation.

The bundled Codex image-generation CLI was used directly. A representative invocation is:

```zsh
python "$IMAGE_GEN" edit \
  --model gpt-image-2 \
  --image apps/web/public/brand/photography/hero.png \
  --prompt-file docs/brand/photography/prompts/hero.txt \
  --size 1536x1024 \
  --quality high \
  --output-format png \
  --no-augment \
  --out output/imagegen/hero.png
```

Use `1024x1536` for the seven portrait assets. Generate into a review directory first; do not overwrite runtime assets until the output passes review.

## Visual acceptance gate

Inspect every output at full resolution for:

- physically plausible hands, fingers, limbs, tools, grip, and service technique;
- age-appropriate, unretouched skin texture and natural expressions;
- safe placement of scissors, combs, files, brushes, tweezers, and hands;
- optically plausible reflections and no duplicated people or objects;
- the locked Chicago-loft environment, restrained smoke/taupe/champagne/bone palette, warm grain, and asymmetric negative space;
- no text, logos, watermarks, branded products, camera-aware poses, or stock-photo smiles.

After approval, copy each final into both runtime directories and verify matching SHA-256 hashes. Run the web and mobile validation suites before release.
