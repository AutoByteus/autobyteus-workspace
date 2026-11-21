#!/usr/bin/env node
/**
 * The iOS app icon set from the product logo (autobyteus-594): every slot of
 * `autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/Contents.json` is rendered from
 * `public/autobyteus-icon.svg` at its exact pixel size (size × scale), onto the logo's own circle color as a full
 * square (as Android's launcher icon: the mark on the brand blue), as an 8-bit RGB PNG without alpha (App Store
 * Connect refuses an app icon with alpha).
 *
 *   node scripts/build-ios-app-icon.mjs          write every slot
 *   node scripts/build-ios-app-icon.mjs --check  fail when a slot is missing, has the wrong size, has alpha, or its
 *                                                pixels differ from the render beyond the tolerance below
 *
 * The comparison is by pixels, not bytes, so a different PNG encoder or libvips build on another machine does not fail
 * it, while any real change of the logo or of a file does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = path.join(webRoot, 'public/autobyteus-icon.svg');
const ICON_SET = path.resolve(webRoot, '../autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset');

/**
 * The largest difference allowed in any channel of any pixel, and the mean absolute difference over all channels, between
 * a stored slot and a fresh render. Measured: identical renders on one machine differ by 0; see the ticket's evidence for
 * the local-versus-CI numbers these leave room for. A changed logo or a hand-edited file differs by far more.
 */
export const MAX_CHANNEL_DIFFERENCE = 8;
export const MAX_MEAN_DIFFERENCE = 0.5;

/** The background: the logo circle's own fill, so the circle vanishes into a full square of that color. */
export const backgroundOf = (svg) => {
  const fill = svg.match(/<circle\b[^>]*\bfill="(#[0-9a-fA-F]{6})"/)?.[1];
  if (!fill) throw new Error(`${path.relative(webRoot, LOGO)} has no <circle fill="#rrggbb">: the icon background comes from it.`);
  return fill;
};

/** Every slot of the icon set: its file and its pixel size. */
export const slotsOf = (contents) => contents.images.map((image) => {
  if (!image.filename) throw new Error(`AppIcon slot ${image.idiom} ${image.size}@${image.scale} has no filename.`);
  const points = Number.parseFloat(image.size.split('x')[0]);
  const scale = Number.parseInt(image.scale, 10);
  return { filename: image.filename, pixels: Math.round(points * scale) };
});

/** The slot rendered from the logo: raw RGB pixels (no alpha), pixels × pixels. */
export const renderSlot = async (svg, background, pixels) => sharp(Buffer.from(svg), { density: (72 * pixels) / 24 })
  .resize(pixels, pixels)
  .flatten({ background })
  .removeAlpha()
  .toColourspace('srgb');

const compare = (expected, actual) => {
  let max = 0;
  let total = 0;
  for (let index = 0; index < expected.length; index += 1) {
    const difference = Math.abs(expected[index] - actual[index]);
    if (difference > max) max = difference;
    total += difference;
  }
  return { max, mean: total / expected.length };
};

/** What is wrong with one stored slot, or null; with the measured difference when it could be compared. */
export const checkSlot = async (svg, background, slot, file) => {
  if (!fs.existsSync(file)) return { problem: 'the file is missing' };
  const metadata = await sharp(file).metadata();
  if (metadata.width !== slot.pixels || metadata.height !== slot.pixels) {
    return { problem: `it is ${metadata.width}x${metadata.height}, not ${slot.pixels}x${slot.pixels}` };
  }
  if (metadata.hasAlpha) return { problem: 'it has an alpha channel (App Store Connect refuses it)' };
  const expected = await (await renderSlot(svg, background, slot.pixels)).raw().toBuffer();
  const actual = await sharp(file).removeAlpha().toColourspace('srgb').raw().toBuffer();
  if (expected.length !== actual.length) return { problem: `its pixel data has ${actual.length} bytes, not ${expected.length}` };
  const difference = compare(expected, actual);
  if (difference.max > MAX_CHANNEL_DIFFERENCE || difference.mean > MAX_MEAN_DIFFERENCE) {
    return {
      problem: `its pixels differ from the logo's render (max ${difference.max} > ${MAX_CHANNEL_DIFFERENCE} or mean ${difference.mean.toFixed(3)} > ${MAX_MEAN_DIFFERENCE}); run ios-icon:build`,
      difference,
    };
  }
  return { problem: null, difference };
};

const main = async () => {
  const check = process.argv.includes('--check');
  const svg = fs.readFileSync(LOGO, 'utf8');
  const background = backgroundOf(svg);
  const slots = slotsOf(JSON.parse(fs.readFileSync(path.join(ICON_SET, 'Contents.json'), 'utf8')));
  let failures = 0;
  for (const slot of slots) {
    const file = path.join(ICON_SET, slot.filename);
    if (check) {
      const result = await checkSlot(svg, background, slot, file);
      const measured = result.difference ? ` (max ${result.difference.max}, mean ${result.difference.mean.toFixed(3)})` : '';
      if (result.problem) {
        failures += 1;
        console.error(`[ios-icon] ${slot.filename}: ${result.problem}${measured}`);
      } else {
        console.log(`[ios-icon] ${slot.filename}: ${slot.pixels}x${slot.pixels} matches${measured}`);
      }
    } else {
      await (await renderSlot(svg, background, slot.pixels)).png({ compressionLevel: 9 }).toFile(file);
      console.log(`[ios-icon] wrote ${slot.filename} (${slot.pixels}x${slot.pixels}, RGB on ${background})`);
    }
  }
  if (failures) {
    console.error(`[ios-icon] ${failures} of ${slots.length} slots do not match the logo.`);
    process.exit(1);
  }
  if (check) console.log(`[ios-icon] all ${slots.length} slots match the logo (on ${background}).`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[ios-icon] ${error.message}`);
    process.exit(1);
  });
}
