#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { detectPeerDependencyIssues } = require('../lib/scan');
const { applyFixes } = require('../lib/fix');
const { formatReport } = require('../lib/output');
const { loadConfig } = require('../lib/config');

async function main() {
  console.log('DEBUG: CLI main() invoked, process.argv:', process.argv);

  program
    .name('peer-dep-helper')
    .description('A CLI tool to detect, audit, and fix peer dependency issues.')
    .option('--json', 'Output report as JSON')
    .option('--silent', 'Suppress all output except errors')
    .option('--cwd <path>', 'Custom working directory', process.cwd())
    .option('--strategy <strategy>', 'Version resolution strategy (strict, compatible, latest)', 'compatible')
    .option('--dry-run', 'Show what would be installed/changed without making any changes')
    .option('--fail-on-issues', 'Exit with a non-zero code if issues are found (for CI pipelines)');

  program.command('audit')
    .description('Print all peer dependency issues')
    .option('--fix', 'Automatically fix issues (for audit command)')
    .action(async (options) => {
      const config = await loadConfig(program.opts(), options);
      const cwd = path.resolve(config.cwd);
      console.log('DEBUG: CLI resolved cwd', cwd);

      if (config.silent) {
        // console.log = () => {};
        // console.warn = () => {};
        // console.error = () => {};
      }

      try {
        const issues = await detectPeerDependencyIssues(cwd, config, program.args);
        const hasIssues = issues.some(issue => issue.status !== 'valid');
        formatReport(issues, config);

        if (!hasIssues && issues.length === 0 && config.ignore && config.ignore.length > 0) {
          console.log('No issues found after applying ignore list.');
        }

        if (config.fix && hasIssues) {
          console.log('\nAttempting to fix issues...');
          await applyFixes(issues, config);
          console.log('Fix attempt complete. Re-auditing...');
          const updatedIssues = await detectPeerDependencyIssues(cwd, config, program.args);
          formatReport(updatedIssues, config);
        }

        if (config.failOnIssues && hasIssues) {
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  program.command('fix')
    .description('Install or suggest the correct versions of missing or mismatched peers')
    .option('--write', 'Write fixed dependencies to package.json')
    .option('--only <packages...>', 'Fix only specified packages (comma-separated)')
    .action(async (options) => {
      const config = await loadConfig(program.opts(), options);
      const cwd = path.resolve(config.cwd);
      console.log('DEBUG: CLI resolved cwd', cwd);

      // Normalize --only to array
      if (options.only) {
        if (Array.isArray(options.only)) {
          config.only = options.only.flatMap(p => p.split(',').map(s => s.trim()));
        } else if (typeof options.only === 'string') {
          config.only = options.only.split(',').map(p => p.trim());
        }
      } else {
        config.only = [];
      }

      if (options.dryRun) {
        config.dryRun = true;
      }

      if (config.silent) {
        // console.log = () => {};
        // console.warn = () => {};
        // console.error = () => {};
      }

      try {
        let issues = await detectPeerDependencyIssues(cwd, config, program.args);
        // Filter all issues by --only for all statuses if set
        if (config.only && config.only.length > 0) {
          issues = issues.filter(issue => config.only.includes(issue.package));
        }
        let fixableIssues = issues.filter(issue => issue.status === 'missing' || issue.status === 'version_mismatch');
        console.log('DEBUG: bin/index.js - fixableIssues after --only filter:', fixableIssues.map(i => i.package));

        if (fixableIssues.length === 0) {
          console.log('No fixable peer dependency issues found.');
          return;
        }

        if (config.dryRun) {
          // console.log('DEBUG: bin/index.js - config before applyFixes (dry run):', config); // Temporary debug log
          // Call applyFixes in dry-run mode to get the "would install" output
          await applyFixes(fixableIssues, { ...config, dryRun: true });
          // Do NOT format the report for the overall audit view in dry run mode for 'fix' command
          // The dry run output is handled by applyFixes
          return;
        }

        console.log('Applying fixes...');
        await applyFixes(fixableIssues, config);
        if (!config.dryRun) {
          console.log('Fixes applied. Re-auditing...');
          const updatedIssues = await detectPeerDependencyIssues(cwd, config, program.args);
          const hasIssues = updatedIssues.some(issue => issue.status !== 'valid');
          // Only show updated issues for the filtered packages if --only is used
          let issuesToReport = updatedIssues;
          if (config.only && config.only.length > 0) {
            issuesToReport = updatedIssues.filter(issue => config.only.includes(issue.package));
          }
          formatReport(issuesToReport, config);
          if (config.failOnIssues && hasIssues) {
            process.exit(1);
          }
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  program.parse(process.argv);
}

main();