const path = require('path');
const fs = require('fs/promises');
const { constants } = require('fs');
const { readPackageJson, scanNodeModules, resolveVersionRange, semver, detectWorkspaces, getLatestVersion } = require('./utils');
const { Spinner } = require('cli-spinner-lite');

const CACHE_FILE_NAME = '.peer-dep-helper-cache.json';

function getCacheFilePath(cwd) {
  return path.join(cwd, CACHE_FILE_NAME);
}

async function readCache(cwd, config) {
  const cachePath = path.normalize(getCacheFilePath(cwd));
  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    let cache;
    try {
      cache = JSON.parse(content);
    } catch (e) {
      throw new Error('Invalid JSON in cache: ' + e.message);
    }
    const currentFileHashes = await getProjectFileHashes(cwd);

    // console.log('DEBUG: Cached file hashes:', cache.fileHashes);
    // console.log('DEBUG: Current file hashes:', currentFileHashes);

    // Simple robust check: invalidate if hashes differ
    if (JSON.stringify(cache.fileHashes) !== JSON.stringify(currentFileHashes)) {
      // console.log('DEBUG: Cache invalidated due to file hash mismatch.');
      return null;
    }
    // Apply ignore filter to cached issues before returning
    if (config.ignore && config.ignore.length > 0) {
      // console.log('DEBUG: scan.js applying ignore list to cached issues:', config.ignore);
      const filteredIssues = cache.issues.filter(issue => !config.ignore.includes(issue.package));
      // console.log('DEBUG: Using cached results (after applying ignore filter).');
      return filteredIssues;
    }
    // console.log('DEBUG: Using cached results.'); // This should only be logged if no ignore filter is applied
    return cache.issues;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Cache file not found, proceed without cache
      // console.log('DEBUG: Cache file not found.');
      return null;
    }
    if (error.code === 'EACCES') {
      throw error;
    }
    // console.warn(`Warning: Could not read cache file: ${error.message}. Invalidate cache.`);
    throw error;
  }
}

async function writeCache(cwd, issues) {
  const cachePath = path.normalize(getCacheFilePath(cwd));
  const fileHashes = await getProjectFileHashes(cwd);
  const cacheContent = {
    timestamp: Date.now(),
    fileHashes: fileHashes,
    issues: issues,
  };
  const cacheDir = path.dirname(cachePath);
  try {
    try {
      await fs.access(cacheDir, constants.W_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(cacheDir, { recursive: true });
      } else {
        throw error;
      }
    }
    await fs.writeFile(cachePath, JSON.stringify(cacheContent, null, 2), 'utf-8');
    // console.log('DEBUG: Cache written successfully.');
  } catch (error) {
    // console.warn(`Warning: Could not write cache file: ${error.message}`);
    throw error;
  }
}

async function getProjectFileHashes(cwd) {
  const hashes = {};
  const filesToHash = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

  for (const file of filesToHash) {
    const filePath = path.join(cwd, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      hashes[file] = require('crypto').createHash('md5').update(content).digest('hex');
      // console.log(`DEBUG: Hashed ${file}: ${hashes[file]}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not hash ${file}: ${error.message}`);
      }
      hashes[file] = null; // Mark as not found or unreadable
      // console.log(`DEBUG: ${file} not found or unreadable, hash set to null.`);
    }
  }
  return hashes;
}

async function detectPeerDependencyIssues(cwd, config, cliArgs = []) {
  // Always bypass cache to ensure real-time detection
  // const isTestEnv = process.env.NODE_ENV === 'test' || process.env.PEER_DEP_HELPER_TEST || process.env.PEER_DEP_HELPER_TEST_MOCK_LATEST;
  // if (!config.fix && !config.dryRun && !isTestEnv) {
  //   const cachedIssues = await readCache(cwd, config);
  //   if (cachedIssues) {
  //     console.log('Using cached results.');
  //     return cachedIssues;
  //   }
  // }

  let rootPackageJson;
  try {
    rootPackageJson = await readPackageJson(cwd);
    // console.log('DEBUG: rootPackageJson', rootPackageJson);
  } catch (error) {
    // Propagate the error so tests expecting a rejection get it
    // console.log('DEBUG: Error reading root package.json', error);
    throw error;
  }
  if (!rootPackageJson) {
    // console.log('DEBUG: No root package.json');
    throw new Error('Root package.json read error');
  }

  // Show workspace detection spinner
  const workspaceSpinner = new Spinner('🔍 Detecting workspaces...');
  workspaceSpinner.start();
  const workspaces = await detectWorkspaces(cwd);
  workspaceSpinner.stop();
  
  const allPackagePaths = [cwd, ...workspaces]; // Include root and all workspace paths

  // Show package scanning spinner
  const scanSpinner = new Spinner(`📦 Scanning ${allPackagePaths.length} package${allPackagePaths.length > 1 ? 's' : ''}...`);
  scanSpinner.start();
  
  const allInstalledPackages = {};
  for (const packagePath of allPackagePaths) {
    const installed = await scanNodeModules(packagePath);
    // console.log('DEBUG: scanNodeModules', { packagePath, installed });
    Object.assign(allInstalledPackages, installed);
  }
  scanSpinner.stop();
  
  // Debug: print all installed packages
  // console.log('DEBUG: allInstalledPackages', allInstalledPackages);

  // Show peer dependency analysis spinner
  const analysisSpinner = new Spinner('🔍 Analyzing peer dependencies...');
  analysisSpinner.start();
  
  // Collect all peer dependencies declared by packages in the project (root and workspaces)
  // { peerDepName: { requiredVersion: { [requiringPackageName]: { versionRange: string, optional: boolean } } } }
  const peerDependencyDemands = {};

  for (const packagePath of allPackagePaths) {
    const pkgJson = await readPackageJson(packagePath);
    if (pkgJson && pkgJson.peerDependencies) {
      // Remove or comment out debug logs
      // console.log('DEBUG: peerDependencies from', packagePath, pkgJson.peerDependencies);
      for (const peerDepName in pkgJson.peerDependencies) {
        const requiredVersion = pkgJson.peerDependencies[peerDepName];
        const isOptional = pkgJson.peerDependenciesMeta && pkgJson.peerDependenciesMeta[peerDepName] && pkgJson.peerDependenciesMeta[peerDepName].optional === true;

        if (!peerDependencyDemands[peerDepName]) {
          peerDependencyDemands[peerDepName] = {};
        }
        if (!peerDependencyDemands[peerDepName][requiredVersion]) {
          peerDependencyDemands[peerDepName][requiredVersion] = {};
        }
        // Store the requiring package name and its specific demand details
        peerDependencyDemands[peerDepName][requiredVersion][pkgJson.name || packagePath] = {
          versionRange: requiredVersion,
          optional: isOptional
        };
      }
    }
  }
  analysisSpinner.stop();
  
  // Debug: print all peer dependency demands
  // console.log('DEBUG: peerDependencyDemands', JSON.stringify(peerDependencyDemands, null, 2));

  // Show issue detection spinner
  const issueSpinner = new Spinner('🔍 Detecting issues...');
  issueSpinner.start();
  
  const issues = [];
  for (const peerDepName in peerDependencyDemands) {
    // console.log('DEBUG: Peer loop', { peerDepName });
    const demandsByVersion = peerDependencyDemands[peerDepName];
    const allDemands = []; // Array of { versionRange: string, optional: boolean, requiredBy: string }
    const allRequiringPackages = new Set();

    for (const requiredVersion in demandsByVersion) {
      for (const requiringPackageName in demandsByVersion[requiredVersion]) {
        const demand = demandsByVersion[requiredVersion][requiringPackageName];
        allDemands.push({
          versionRange: demand.versionRange,
          optional: demand.optional,
          requiredBy: requiringPackageName
        });
        allRequiringPackages.add(requiringPackageName);
      }
    }

    const installedVersion = allInstalledPackages[peerDepName] || null;
    // DEBUG: Print peerDepName, installedVersion, allDemands
    // console.log('DEBUG: Checking peerDepName', peerDepName);
    // console.log('DEBUG: installedVersion', installedVersion);
    // console.log('DEBUG: allDemands', allDemands);
    const resolvedRequiredVersion = resolveVersionRange(allDemands.map(d => d.versionRange), config.strategy);
    const latestVersionRaw = await getLatestVersion(peerDepName);
    const latestVersion = latestVersionRaw || null; // Only use real latest version

    // Check if any demand is not optional and missing
    const isMissingAndRequired = !installedVersion && allDemands.some(d => !d.optional);
    if (isMissingAndRequired) {
      const issueBase = {
        package: peerDepName,
        requiredBy: Array.from(allRequiringPackages).join(', '),
        requiredVersion: resolvedRequiredVersion,
        installedVersion: installedVersion,
        demandedBy: allDemands.map(d => ({ name: d.requiredBy, versionRange: d.versionRange, optional: d.optional })),
        latestVersion: latestVersion,
      };
      // console.log('DEBUG: Reporting missing peer', issueBase);
      issues.push({ ...issueBase, status: 'missing' });
      continue;
    }

    // Check if installed version satisfies all individual demands
    let satisfiesAllIndividualDemands = true;
    if (installedVersion) {
      for (const demand of allDemands) {
        // Handle '*' and empty/null requiredVersion as always satisfied if installed
        if (demand.versionRange === '*' || !demand.versionRange) {
          // Always satisfied if installed
        } else if (!semver.satisfies(installedVersion, demand.versionRange)) {
          satisfiesAllIndividualDemands = false;
          break;
        }
      }
    } else {
      satisfiesAllIndividualDemands = false; // If not installed, it can't satisfy any demand
    }

    const issueBase = {
      package: peerDepName,
      requiredBy: Array.from(allRequiringPackages).join(', '),
      requiredVersion: resolvedRequiredVersion,
      installedVersion: installedVersion,
      demandedBy: allDemands.map(d => ({ name: d.requiredBy, versionRange: d.versionRange, optional: d.optional })),
      latestVersion: latestVersion,
    };

    // Debug print for outdated detection
    if (config && config.debug) console.log('DEBUG: Outdated check for', peerDepName);
    console.log('  installedVersion:', installedVersion);
    console.log('  latestVersion:', latestVersion);
    console.log('  semver.lt(installedVersion, latestVersion):', installedVersion && latestVersion ? semver.lt(installedVersion, latestVersion) : 'N/A');
    console.log('  satisfiesAllIndividualDemands:', satisfiesAllIndividualDemands);

    if (installedVersion && latestVersion && semver.lt(installedVersion, latestVersion)) {
      // Always mark as outdated if installedVersion < latestVersion
      issues.push({ ...issueBase, status: 'outdated', requiredVersion: latestVersion });
      continue;
    } else if (installedVersion && !satisfiesAllIndividualDemands) {
      issues.push({ ...issueBase, status: 'version_mismatch' });
    } else if (installedVersion) { // It's installed and satisfies all individual demands (or is not outdated)
      issues.push({ ...issueBase, status: 'valid' });
    }
    // If it's missing but all demands are optional, we don't add an issue.
  }
  issueSpinner.stop();
  
  // Before returning, print the issues
  // console.log('DEBUG: About to write cache', issues);
  // await writeCache(cwd, issues);

  // Filter out ignored issues
  if (config.ignore) {
    // console.log('DEBUG: scan.js using ignore list:', config.ignore);
  }
  const filteredIssues = issues.filter(issue => {
    if (config.ignore && config.ignore.includes(issue.package)) {
      // console.log(`DEBUG: Ignoring ${issue.package} as per configuration.`);
      return false;
    }
    return true;
  });
  // console.log('DEBUG: Filtered issues (after ignore list application):', filteredIssues);
  // console.log('DEBUG: FINAL ISSUES', filteredIssues);
  return filteredIssues;
}

module.exports = {
  detectPeerDependencyIssues,
};
