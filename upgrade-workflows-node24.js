#!/usr/bin/env node

/**
 * upgrade-workflows-node24.js
 *
 * Scans GitHub Actions workflow files (.github/workflows/*.{yml,yaml}) in any repository
 * and upgrades all workflow actions and commands that target the deprecated Node 20 runtime
 * to their official Node 24 releases, eliminating the deprecation warning:
 *
 *   "Node.js 20 is deprecated. The following actions target Node.js 20 but are being
 *    forced to run on Node.js 24: actions/checkout@v4, docker/build-push-action@v6,
 *    docker/login-action@v3, docker/metadata-action@v5, docker/setup-buildx-action@v3."
 *
 * Action Upgrades applied:
 *   - actions/checkout@v4 (or v2/v3)       -> actions/checkout@v7
 *   - docker/build-push-action@v6 (or <v7) -> docker/build-push-action@v7
 *   - docker/login-action@v3 (or <v4)      -> docker/login-action@v4
 *   - docker/metadata-action@v5 (or <v6)   -> docker/metadata-action@v6
 *   - docker/setup-buildx-action@v3 (or <v4)-> docker/setup-buildx-action@v4
 *   - actions/setup-node@v4 (or <v7)       -> actions/setup-node@v7
 *   - actions/upload-artifact@v4 (or <v7)  -> actions/upload-artifact@v7
 *   - actions/download-artifact@v4 (or <v8)-> actions/download-artifact@v8
 *   - actions/cache@v4 (or <v6)            -> actions/cache@v6
 *   - actions/github-script@v7 (or <v9)    -> actions/github-script@v9
 *   - setup-node node-version: 20          -> node-version: 24
 *
 * Usage:
 *   node upgrade-workflows-node24.js [target-directory] [--dry-run]
 *
 * Examples:
 *   node upgrade-workflows-node24.js .
 *   node upgrade-workflows-node24.js D:\rukous
 *   node upgrade-workflows-node24.js D:\tunnus --dry-run
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve, relative } from 'path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetArg = args.find((a) => !a.startsWith('--'));
const targetDir = resolve(targetArg || process.cwd());

const ACTION_UPGRADES = [
  {
    name: 'actions/checkout',
    pattern: /actions\/checkout@(v[1-4](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/checkout@v7',
  },
  {
    name: 'docker/build-push-action',
    pattern: /docker\/build-push-action@(v[1-6](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'docker/build-push-action@v7',
  },
  {
    name: 'docker/login-action',
    pattern: /docker\/login-action@(v[1-3](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'docker/login-action@v4',
  },
  {
    name: 'docker/metadata-action',
    pattern: /docker\/metadata-action@(v[1-5](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'docker/metadata-action@v6',
  },
  {
    name: 'docker/setup-buildx-action',
    pattern: /docker\/setup-buildx-action@(v[1-3](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'docker/setup-buildx-action@v4',
  },
  {
    name: 'actions/setup-node',
    pattern: /actions\/setup-node@(v[1-5](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/setup-node@v7',
  },
  {
    name: 'actions/upload-artifact',
    pattern: /actions\/upload-artifact@(v[1-5](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/upload-artifact@v7',
  },
  {
    name: 'actions/download-artifact',
    pattern: /actions\/download-artifact@(v[1-6](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/download-artifact@v8',
  },
  {
    name: 'actions/cache',
    pattern: /actions\/cache@(v[1-4](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/cache@v6',
  },
  {
    name: 'actions/github-script',
    pattern: /actions\/github-script@(v[1-7](?:\.\d+(?:\.\d+)?)?)/g,
    target: 'actions/github-script@v9',
  },
];

const NODE_VERSION_PATTERNS = [
  { pattern: /(node-version:\s*['"]?)20(\.x)?(['"]?)/gi, replacement: '$124$2$3' },
  { pattern: /(node-version:\s*\[\s*['"]?)20(\.x)?(['"]?\s*\])/gi, replacement: '$124$2$3' },
  { pattern: /(node:\s*\[\s*['"]?)20(\.x)?(['"]?\s*\])/gi, replacement: '$124$2$3' },
];

async function findWorkflowFiles(dir, fileList = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    return fileList;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      await findWorkflowFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if ((lower.endsWith('.yml') || lower.endsWith('.yaml')) && fullPath.includes('.github')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function upgradeWorkflowContent(rawContent, relPath) {
  let content = rawContent;
  const changes = [];

  // 1. Upgrade action references targeting Node 20
  for (const upgrade of ACTION_UPGRADES) {
    const matches = [...content.matchAll(upgrade.pattern)];
    if (matches.length > 0) {
      for (const m of matches) {
        changes.push({
          from: m[0],
          to: upgrade.target,
        });
      }
      content = content.replace(upgrade.pattern, upgrade.target);
    }
  }

  // 2. Upgrade node-version statements (setup-node, matrix)
  for (const nv of NODE_VERSION_PATTERNS) {
    if (nv.pattern.test(content)) {
      content = content.replace(nv.pattern, nv.replacement);
      changes.push({
        from: 'node-version: 20',
        to: 'node-version: 24',
      });
    }
  }

  return {
    changed: changes.length > 0,
    content,
    changes,
  };
}

async function main() {
  console.log(`\n================================================================`);
  console.log(` GitHub Actions Node 20 -> Node 24 Workflow Upgrader`);
  console.log(` Target directory: ${targetDir}`);
  if (isDryRun) {
    console.log(` Mode: DRY RUN (no files will be written)`);
  }
  console.log(`================================================================\n`);

  const workflowFiles = await findWorkflowFiles(targetDir);

  if (workflowFiles.length === 0) {
    console.log(`No .github/workflows/*.{yml,yaml} files found in ${targetDir}`);
    return;
  }

  let totalUpdatedFiles = 0;
  let totalUpgrades = 0;

  for (const file of workflowFiles) {
    const rel = relative(targetDir, file);
    let raw;
    try {
      raw = await readFile(file, 'utf-8');
    } catch (err) {
      console.warn(`Could not read ${rel}: ${err.message}`);
      continue;
    }

    const { changed, content, changes } = upgradeWorkflowContent(raw, rel);

    if (changed) {
      totalUpdatedFiles++;
      totalUpgrades += changes.length;
      console.log(`\x1b[32m✔\x1b[0m ${rel}:`);
      for (const c of changes) {
        console.log(`    \x1b[31m- ${c.from}\x1b[0m`);
        console.log(`    \x1b[32m+ ${c.to}\x1b[0m`);
      }
      if (!isDryRun) {
        await writeFile(file, content, 'utf-8');
      }
      console.log('');
    } else {
      console.log(`\x1b[90m- ${rel} (already up to date)\x1b[0m`);
    }
  }

  console.log(`----------------------------------------------------------------`);
  console.log(` Summary:`);
  console.log(`   Workflows scanned:  ${workflowFiles.length}`);
  console.log(`   Workflows modified: ${totalUpdatedFiles}`);
  console.log(`   Actions upgraded:   ${totalUpgrades}`);
  console.log(`----------------------------------------------------------------\n`);
}

main().catch((err) => {
  console.error('Error running workflow upgrader:', err);
  process.exit(1);
});
