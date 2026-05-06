#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const projectIndex = argv.indexOf('--project');
if (projectIndex === -1 || !argv[projectIndex + 1]) {
  console.error('Usage: node tools/containers/write-image-manifest.mjs --project <projectName>');
  process.exit(1);
}

const projectName = argv[projectIndex + 1];
const registry = process.env.REGISTRY ?? 'ghcr.io';
const repository = process.env.ORG_LC ?? 'ethio-connect-et';
const imageTag = process.env.IMAGE_TAG ?? process.env.VERSION ?? 'latest';

const outputDir = path.join('dist', 'containers', projectName);
const pushMetadataPath = path.join(outputDir, 'push-metadata.json');
const imagePath = path.join(outputDir, 'image.json');

let digest = '';
try {
  const raw = await readFile(pushMetadataPath, 'utf8');
  const metadata = JSON.parse(raw);
  digest = metadata['containerimage.digest'] ?? '';
} catch {
  digest = '';
}

const imageName = `${registry}/${repository}/${projectName}:${imageTag}`;
const imageRef = digest ? `${registry}/${repository}/${projectName}@${digest}` : '';

await mkdir(outputDir, { recursive: true });
await writeFile(
  imagePath,
  `${JSON.stringify(
    {
      project: projectName,
      image: imageName,
      digest,
      ref: imageRef,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
