// Downloads the food-scan model into models/ (git-ignored) and verifies it, so what runs is
// exactly the reviewed file. Safe to re-run: a verified copy is left alone. Needs no packages.
//
// The model is CLIP ViT-B/32 (MIT license), image encoder only, quantized. Changing it means
// updating URL and SHA256 here, MODEL_FILE in photo-fingerprint.service.ts, and re-creating
// every fingerprint, because fingerprints from different models can't be compared.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const REVISION = '6b7c523703ae26e39be4b03774966f8571c7f523';
const URL = `https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/${REVISION}/onnx/vision_model_quantized.onnx`;
const SHA256 =
  '583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299';
const FILE = resolve('models/clip-vit-base-patch32-q8.onnx');

async function sha256(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

if (existsSync(FILE) && (await sha256(FILE)) === SHA256) {
  console.log('Food-scan model is ready.');
  process.exit(0);
}

console.log('Downloading the food-scan model (about 85 MB)...');
await mkdir(dirname(FILE), { recursive: true });
const response = await fetch(URL);
if (!response.ok) {
  throw new Error(`Could not download the model: HTTP ${response.status}`);
}
const partial = `${FILE}.partial`;
await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
const actual = await sha256(partial);
if (actual !== SHA256) {
  await rm(partial);
  throw new Error(`The downloaded model has the wrong checksum: ${actual}`);
}
await rename(partial, FILE);
console.log('Food-scan model is ready.');
