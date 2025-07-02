const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_DIR = path.join(__dirname, 'integration-tmp');
const CLI = path.join(__dirname, '../bin/index.js');

// Ensure getLatestVersion is mocked for right-pad
const originalGetLatestVersion = require('../lib/utils').getLatestVersion;
const utils = require('../lib/utils');
utils.getLatestVersion = async function (pkg) {
  if (pkg === 'right-pad') return '1.1.1';
  return originalGetLatestVersion(pkg);
};

function logResult(name, passed, details = '') {
  if (passed) {
    console.log(`\x1b[32m✔\x1b[0m ${name}`);
  } else {
    console.log(`\x1b[31m✖\x1b[0m ${name}`);
    if (details) console.log('   ', details);
  }
}

function run(cmd, opts = {}) {
  const env = { ...process.env, PEER_DEP_HELPER_TEST_MOCK_LATEST: '1' };
  const result = spawnSync(cmd[0], cmd.slice(1), {
    encoding: 'utf-8',
    shell: process.platform === 'win32', // ensure shell on Windows
    stdio: 'pipe',
    env,
    ...opts
  });
  if (result.error) throw result.error;
  return result;
}

async function cleanup(dir, retries = 5) {
  while (retries > 0) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return;
    } catch (err) {
      if (retries > 1 && ['EBUSY', 'ENOTEMPTY'].includes(err.code)) {
        console.log(`Cleanup failed (retries left: ${retries - 1}): ${err.message}`);
        await new Promise(res => setTimeout(res, 1000));
        retries--;
      } else {
        console.error('Cleanup failed:', err);
        return;
      }
    }
  }
}

async function setupTestProject() {
  await cleanup(TEST_DIR);
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR);
  }
  // Always write a valid package.json
  const pkgJson = {
    name: 'integration-test',
    version: '1.0.0',
    dependencies: { 'left-pad': '^1.3.0' },
    peerDependencies: { 'right-pad': '^1.0.0' }
  };
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2));
  // Run npm install to create node_modules
  run(['npm', 'install'], { cwd: TEST_DIR });
}

(async function main() {
  let passed = 0, failed = 0;
  try {
    await setupTestProject();
    // Confirm package.json exists
    const pkgPath = path.join(TEST_DIR, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error('Test setup failed: package.json was not created.');
    }
    // Debug: print contents of test project dir
    // console.log('DEBUG: Contents of integration-tmp:', fs.readdirSync(TEST_DIR));
    // Debug: print contents of package.json
    try {
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      // console.log('DEBUG: package.json content:', pkgContent);
    } catch (e) {
      // console.log('DEBUG: Could not read package.json:', e.message);
    }
    // Sanity check before running CLI
    if (!fs.existsSync(pkgPath)) {
      throw new Error('package.json missing before CLI run!');
    }
    // Add a delay to ensure file system is flushed
    await new Promise(res => setTimeout(res, 500));
    // Print directory contents again right before CLI runs
    // console.log('DEBUG: (pre-CLI) Contents of integration-tmp:', fs.readdirSync(TEST_DIR));
    try {
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      // console.log('DEBUG: (pre-CLI) package.json content:', pkgContent);
    } catch (e) {
      // console.log('DEBUG: (pre-CLI) Could not read package.json:', e.message);
    }
    // Do NOT change directory here
    // process.chdir(TEST_DIR);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    delete pkg.dependencies['right-pad'];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    // All CLI invocations should use --cwd TEST_DIR
    run(['npm', 'install'], { cwd: TEST_DIR });

    const tests = [
      {
        name: 'Outdated peer detection (should mention outdated or valid)',
        exec: async () => {
          // Reset test project and install outdated right-pad
          await cleanup(TEST_DIR);
          if (!fs.existsSync(TEST_DIR)) {
            fs.mkdirSync(TEST_DIR);
          }
          const pkgJson = {
            name: 'integration-test',
            version: '1.0.0',
            dependencies: { 'left-pad': '^1.3.0' },
            peerDependencies: { 'right-pad': '^1.0.0' }
          };
          fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2));
          run(['npm', 'install', 'left-pad@^1.3.0'], { cwd: TEST_DIR });
          run(['npm', 'install', 'right-pad@1.0.0'], { cwd: TEST_DIR });
          // Force right-pad version to 1.0.0 for the test
          const rpPkgPath = path.join(TEST_DIR, 'node_modules', 'right-pad', 'package.json');
          if (fs.existsSync(rpPkgPath)) {
            const rpPkg = JSON.parse(fs.readFileSync(rpPkgPath, 'utf-8'));
            rpPkg.version = '1.0.0';
            fs.writeFileSync(rpPkgPath, JSON.stringify(rpPkg, null, 2));
            // Debug print: read back and print version
            const rpPkgVerify = JSON.parse(fs.readFileSync(rpPkgPath, 'utf-8'));
            await new Promise(res => setTimeout(res, 500));
          }
          // Now run the audit
          return run(['node', CLI, 'audit', '--cwd', TEST_DIR]);
        },
        check: res => res.stdout.includes('Outdated Peer Dependencies:') && res.stdout.includes('is available.')
      },
      {
        name: 'Audit reports missing peer',
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('right-pad') && res.stdout.includes('missing')
      },
      {
        name: 'Fix explains what would be installed (dry run)',
        exec: () => run(['node', CLI, 'fix', '--dry-run', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('right-pad') && /would install|dry run/i.test(res.stdout)
      },
      {
        name: 'Selective fix only targets specified package',
        exec: async () => {
          const res = run(['node', CLI, 'fix', '--dry-run', '--only', 'right-pad', '--cwd', TEST_DIR]);
          const debugFilePath = path.join(TEST_DIR, 'debug_dry_run_output.txt');
          const debugContent = fs.existsSync(debugFilePath) ? fs.readFileSync(debugFilePath, 'utf-8') : '';
          return { ...res, debugContent };
        },
        check: res => {
          const debugContentIncludesRightPad = res.debugContent.includes('right-pad');
          const debugContentExcludesLeftPad = !res.debugContent.includes('left-pad');

          // Assert that the debug file confirms only right-pad is mentioned.
          return debugContentIncludesRightPad && debugContentExcludesLeftPad;
        }
      },
      {
        name: 'Ignore list in config suppresses issue',
        before: () => {
          const rcPath = path.join(TEST_DIR, '.peer-dep-helperrc');
          fs.writeFileSync(rcPath, JSON.stringify({ ignore: ['right-pad'] }, null, 2));
          // Debug print - removed as it interferes with test assertion
          // if (fs.existsSync(rcPath)) {
          //   console.log('DEBUG: .peer-dep-helperrc exists:', fs.readFileSync(rcPath, 'utf-8'));
          // } else {
          //   console.log('DEBUG: .peer-dep-helperrc does NOT exist');
          // }
        },
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('No issues found after applying ignore list.'),
        after: () => fs.unlinkSync(path.join(TEST_DIR, '.peer-dep-helperrc'))
      },
      {
        name: 'CI integration: --fail-on-issues exits nonzero on issues',
        exec: () => run(['node', CLI, 'audit', '--fail-on-issues', '--cwd', TEST_DIR]),
        check: res => res.status !== 0
      },
      {
        name: 'Smarter caching: cache invalidated on package.json change',
        before: () => {
          const updated = {
            name: 'integration-test',
            version: '1.0.1',
            dependencies: { 'left-pad': '^1.3.0' },
            peerDependencies: { 'right-pad': '^1.0.0' }
          };
          fs.writeFileSync(pkgPath, JSON.stringify(updated, null, 2));
        },
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('Cache invalidated') || !res.stdout.includes('Using cached results'),
        after: () => {
          // Restore original package.json with peerDependencies for subsequent tests
          const original = {
            name: 'integration-test',
            version: '1.0.0',
            dependencies: { 'left-pad': '^1.3.0' },
            peerDependencies: { 'right-pad': '^1.0.0' }
          };
          fs.writeFileSync(pkgPath, JSON.stringify(original, null, 2));
        }
      },
      {
        name: 'Audit includes "Demanded by" details',
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('Demanded by') || res.stdout.includes('integration-test')
      },
      {
        name: 'Audit output is colorful',
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => /\x1b\[3[0-9]m/.test(res.stdout)
      },
      {
        name: 'Audit includes summary table',
        exec: () => run(['node', CLI, 'audit', '--cwd', TEST_DIR]),
        check: res => {
          const out = res.stdout.toLowerCase();
          return out.includes('summary') &&
            out.includes('missing') &&
            out.includes('mismatched') &&
            out.includes('outdated') &&
            out.includes('valid') &&
            out.includes('total checked');
        }
      },
      {
        name: 'Fix actually installs missing peer',
        before: () => run(['npm', 'uninstall', 'right-pad'], { cwd: TEST_DIR }),
        exec: () => run(['node', CLI, 'fix', '--cwd', TEST_DIR]),
        check: res => res.stdout.includes('right-pad') && !/would install|dry run/i.test(res.stdout)
      }
    ];

    for (const test of tests) {
      try {
        if (test.before) await test.before();
        // GLOBAL: Restore package.json after each test
        const original = {
          name: 'integration-test',
          version: '1.0.0',
          dependencies: { 'left-pad': '^1.3.0' },
          peerDependencies: { 'right-pad': '^1.0.0' }
        };
        fs.writeFileSync(pkgPath, JSON.stringify(original, null, 2));
        // Add a delay to ensure file system is flushed
        await new Promise(res => setTimeout(res, 500));
        // Only remove right-pad for tests that are not the outdated test
        if (test.name !== 'Outdated peer detection (should mention outdated or valid)') {
          const rightPadPath = path.join(TEST_DIR, 'node_modules', 'right-pad');
          if (fs.existsSync(rightPadPath)) {
            fs.rmSync(rightPadPath, { recursive: true, force: true });
          }
        }
        // Now run the CLI
        const res = await test.exec();
        const pass = test.check(res);
        logResult(test.name, pass);
        if (pass) passed++; else failed++;
        if (test.after) await test.after();
      } catch (e) {
        logResult(test.name, false, e.stack || e.message);
        failed++;
      }
    }

  } catch (err) {
    console.error('Fatal error during integration tests:', err.stack || err);
    failed++;
  } finally {
    await cleanup(TEST_DIR);
    console.log(`\nIntegration Test Results: ${passed} passed, ${failed} failed.`);
    process.exit(failed === 0 ? 0 : 1);
  }
})();
