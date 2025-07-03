const path = require('path');
const { cosmiconfig } = require('cosmiconfig');

const explorer = cosmiconfig('peer-dep-helper');

async function loadConfig(programOpts, commandOpts) {
  let config = {};
  const resolvedCwd = path.resolve(commandOpts.cwd || programOpts.cwd || process.cwd());

  try {
    const result = await explorer.search(resolvedCwd);
    if (result && result.config) {
      config = result.config;
    }
  } catch (error) {
    console.warn(`Warning: Could not load .peer-dep-helperrc: ${error.message}`);
  }

  // Merge CLI options, but only override ignore if explicitly set
  let merged = {
    ...config,
    ...programOpts,
    ...commandOpts,
    cwd: resolvedCwd,
  };
  // Explicitly apply programOpts and commandOpts, giving them precedence.
  // If ignore was not provided by CLI, it will retain the value from `config`.
  if (programOpts.ignore !== undefined) {
    merged.ignore = programOpts.ignore;
  }
  if (commandOpts.ignore !== undefined) {
    merged.ignore = commandOpts.ignore;
  }
  if (config.debug) console.log('DEBUG: loadConfig merged config:', merged);
  if (config.debug) console.log('DEBUG: loadConfig final ignore list:', merged.ignore);
  return merged;
}

module.exports = {
  loadConfig,
};