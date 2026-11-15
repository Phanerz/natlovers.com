// Builds the hosted email images in public/email/ at 2x resolution. Gmail blocks SVG and base64
// images, so emails need real PNG files on the site. Run once with: npx tsx scripts/build-email-assets.ts
//   logo.png   the real Natlovers logo from public/natlovers-logo.avif, converted, never redrawn
//   tape.png   the strip of tape from the "Make it yours" order note (no text)
//   paper.png  a small paper grain tile, used only as a progressive enhancement
import {mkdirSync} from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.join(process.cwd(), "public", "email");

async function main() {
  mkdirSync(out, {recursive: true});

  // Displayed at 180px wide, so 360px here.
  await sharp(path.join(process.cwd(), "public", "natlovers-logo.avif")).resize({width: 360}).png({compressionLevel: 9}).toFile(path.join(out, "logo.png"));

  // Same colours and torn edge as the note's tape (app/globals.css, .pdp-customise::before).
  // Displayed at 120 x 26, drawn at 240 x 52, with the note's slight tilt baked in.
  const tape = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="52" viewBox="0 0 240 52">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4d6b2" stop-opacity="0.92"/><stop offset="1" stop-color="#d6c69e" stop-opacity="0.85"/></linearGradient></defs>
    <g transform="rotate(1.5 120 26)">
      <polygon fill="url(#g)" points="6,8 234,8 240,17 233,26 240,34 236,44 6,44 0,38 7,30 0,21"/>
    </g>
  </svg>`;
  await sharp(Buffer.from(tape)).png({compressionLevel: 9}).toFile(path.join(out, "tape.png"));

  // A 220px grain tile in the note's brown ink, very faint, with transparency.
  const size = 220;
  const raw = Buffer.alloc(size * size * 4);
  let seed = 1998;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < size * size; i += 1) {
    raw[i * 4] = 90;
    raw[i * 4 + 1] = 70;
    raw[i * 4 + 2] = 40;
    raw[i * 4 + 3] = Math.round(next() * 16);
  }
  await sharp(raw, {raw: {width: size, height: size, channels: 4}}).png({compressionLevel: 9}).toFile(path.join(out, "paper.png"));
  console.log("Wrote logo.png, tape.png and paper.png to public/email/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
