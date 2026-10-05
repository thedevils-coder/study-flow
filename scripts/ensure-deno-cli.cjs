#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const denoPkg = path.join(root, 'node_modules', 'deno');
const installApiPath = path.join(denoPkg, 'install_api.cjs');

if (!fs.existsSync(installApiPath)) {
  console.warn('Deno npm package is not installed. Run npm install.');
  process.exit(0);
}

const api = require(installApiPath);
let exePath;
try {
  exePath = api.runInstall();
} catch (err) {
  console.warn(
    'Could not resolve the Deno CLI:',
    err && err.message ? err.message : err,
  );
  process.exit(0);
}

try {
  api.replaceBinEntry(exePath);
} catch (_err) {
  // The official deno postinstall already attempts this.
}

if (!exePath || !fs.existsSync(exePath)) {
  console.warn('Deno CLI executable was not found after npm install.');
  process.exit(0);
}

if (os.platform() === 'win32') {
  const binDir = path.join(root, 'node_modules', '.bin');
  const binExe = path.join(binDir, 'deno.exe');
  fs.mkdirSync(binDir, { recursive: true });
  if (path.resolve(exePath) !== path.resolve(binExe)) {
    try {
      fs.copyFileSync(exePath, binExe);
    } catch (_err) {
      // Command lookup can still use node_modules/deno/deno.exe.
    }
  }
}

console.log('Deno CLI ready:', exePath);
