import { existsSync, readFileSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const images = JSON.parse(readFileSync(path.join(root, "content", "images.json"), "utf8"));
const index = {};
const stampPath = path.join(root, "public", "media", "stamps.json");
let stamps = {};
if (existsSync(stampPath)) {
  stamps = JSON.parse(readFileSync(stampPath, "utf8"));
}

async function newer(output, inputMtime) {
  if (!existsSync(output)) return false;
  const outputStat = await stat(output);
  return outputStat.mtimeMs >= inputMtime;
}

function oriented(input, turn) {
  const pipeline = sharp(input).rotate();
  return turn ? pipeline.rotate(turn) : pipeline;
}

for (const image of images) {
  if (!image.publish) continue;
  const input = path.join(root, "photos", image.filename);
  if (!existsSync(input)) {
    console.warn(`Missing original: ${image.filename}`);
    continue;
  }

  const dir2000 = path.join(root, "public", "media", "2000");
  const dir960 = path.join(root, "public", "media", "960");
  await mkdir(dir2000, { recursive: true });
  await mkdir(dir960, { recursive: true });

  const file2000 = path.join(dir2000, image.filename);
  const file960 = path.join(dir960, image.filename);
  const inputMtime = (await stat(input)).mtimeMs;
  const turn = Number(image.turn) || 0;
  const stamp = `${Math.floor(inputMtime)}:${turn}`;
  const stampOk = !turn || stamps[image.filename] === stamp;

  if (!(stampOk && (await newer(file2000, inputMtime)))) {
    await oriented(input, turn)
      .resize({ width: 2000, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(file2000);
  }

  const meta = await sharp(file2000).metadata();
  if ((meta.width || 0) > 1100 && !(stampOk && (await newer(file960, inputMtime)))) {
    await oriented(input, turn)
      .resize({ width: 960, withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(file960);
  }

  stamps[image.filename] = stamp;

  const large = await sharp(file2000).metadata();
  const srcset = [{ src: `/media/2000/${image.filename}`, width: large.width }];
  if (existsSync(file960)) {
    const small = await sharp(file960).metadata();
    srcset.push({ src: `/media/960/${image.filename}`, width: small.width });
  }
  srcset.sort((a, b) => a.width - b.width);

  index[image.filename] = {
    full: `/media/2000/${image.filename}`,
    src: srcset[0].src,
    srcset,
    width: large.width,
    height: large.height,
  };
  console.log(`Prepared ${image.filename}`);
}

await mkdir(path.join(root, "public", "media"), { recursive: true });
await writeFile(path.join(root, "public", "media", "index.json"), JSON.stringify(index, null, 2));
await writeFile(stampPath, JSON.stringify(stamps, null, 2));
console.log(`Image index: ${Object.keys(index).length} published file(s).`);
