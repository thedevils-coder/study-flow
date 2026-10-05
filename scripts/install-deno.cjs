#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VERSION = '2.9.6';
const ROOT = path.resolve(__dirname, '..');
const TOOLS_BIN = path.join(ROOT, '.tools', 'bin');
const IS_WIN = os.platform() === 'win32';
const EXE_NAME = IS_WIN ? 'deno.exe' : 'deno';
const EXE_PATH = path.join(TOOLS_BIN, EXE_NAME);

const ASSETS = {
  'win32-x64': 'deno-x86_64-pc-windows-msvc.zip',
  'win32-arm64': 'deno-aarch64-pc-windows-msvc.zip',
  'linux-x64': 'deno-x86_64-unknown-linux-gnu.zip',
  'linux-arm64': 'deno-aarch64-unknown-linux-gnu.zip',
  'darwin-x64': 'deno-x86_64-apple-darwin.zip',
  'darwin-arm64': 'deno-aarch64-apple-darwin.zip',
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function alreadyInstalled() {
  return fs.existsSync(EXE_PATH);
}

function assetName() {
  const key = `${os.platform()}-${os.arch()}`;
  const asset = ASSETS[key];
  if (!asset) {
    fail(`No Deno binary is published for ${key}.`);
  }
  return asset;
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status} ${res.statusText}): ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const fd = fs.openSync(zipPath, 'r');
  const magic = Buffer.alloc(2);
  fs.readSync(fd, magic, 0, 2, 0);
  fs.closeSync(fd);
  if (magic.toString('latin1') !== 'PK') {
    fail(`Downloaded file is not a zip archive: ${zipPath}`);
  }

  const zipPy = 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])';
  const attempts = IS_WIN
    ? [
        ['tar', ['-xf', zipPath, '-C', destDir]],
        [
          'powershell.exe',
          [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
          ],
        ],
        ['py', ['-3', '-c', zipPy, zipPath, destDir]],
        ['python', ['-c', zipPy, zipPath, destDir]],
      ]
    : [
        ['unzip', ['-o', zipPath, '-d', destDir]],
        ['python3', ['-c', zipPy, zipPath, destDir]],
      ];

  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.status === 0) return;
  }

  fail(`Could not extract ${zipPath}.`);
}

async function main() {
  if (alreadyInstalled()) {
    console.log('Deno CLI ready:', EXE_PATH);
    return;
  }

  const asset = assetName();
  const url = `https://github.com/denoland/deno/releases/download/v${VERSION}/${asset}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-flow-deno-'));
  const zipPath = path.join(tmpDir, asset);

  try {
    console.log('Installing Deno', VERSION, 'to', TOOLS_BIN);
    await download(url, zipPath);
    fs.mkdirSync(TOOLS_BIN, { recursive: true });
    extractZip(zipPath, TOOLS_BIN);
    if (!IS_WIN) {
      fs.chmodSync(EXE_PATH, 0o755);
    }
  } catch (err) {
    fail(err && err.message ? err.message : String(err));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  if (!alreadyInstalled()) {
    fail(`Deno download succeeded but ${EXE_PATH} was not created.`);
  }

  console.log('Deno CLI ready:', EXE_PATH);
}

main();
