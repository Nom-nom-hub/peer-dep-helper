const chalk = require('chalk');
const Table = require('cli-table3');

// Force color output even in non-TTY
if (chalk.level === 0) chalk.level = 1;

function formatReport(issues, config) {
  // Hard assertion: if config.only is set, all issues must be in config.only
  if (config.only && Array.isArray(config.only) && config.only.length > 0) {
    const notAllowed = issues.filter(issue => !config.only.includes(issue.package));
    if (notAllowed.length > 0) {
      throw new Error('formatReport: issues list contains packages not in config.only: ' + notAllowed.map(i => i.package).join(', '));
    }
  }
  if (config && config.debug) console.log('DEBUG: formatReport received issues:', issues.map(i => ({ package: i.package, status: i.status })));
  if (config.json) {
    console.log(JSON.stringify({
      status: issues.some(issue => issue.status !== 'valid') ? 'fail' : 'success',
      issues: issues.map(issue => ({
        package: issue.package,
        requiredBy: issue.requiredBy,
        requiredVersion: issue.requiredVersion,
        installedVersion: issue.installedVersion,
        status: issue.status,
        // Add more details for JSON output
        demandedBy: issue.demandedBy, // Array of { name, versionRange, optional }
        latestVersion: issue.latestVersion, // For outdated detection
      })),
    }, null, 2));
    return;
  }

  if (config.silent) {
    return; // Suppress output if silent flag is true
  }

  const missingIssues = issues.filter(issue => issue.status === 'missing');
  const mismatchIssues = issues.filter(issue => issue.status === 'version_mismatch');
  const validIssues = issues.filter(issue => issue.status === 'valid');
  const outdatedIssues = issues.filter(issue => issue.status === 'outdated');
  const totalIssues = missingIssues.length + mismatchIssues.length + outdatedIssues.length;

  if (issues.length === 0) {
    console.log(chalk.green('✅ No peer dependency issues found.'));
    return;
  }

  console.log(chalk.bold('Peer Dependency Audit Report:\n'));

  // Always print summary table
  const table = new Table({
    head: [chalk.bold('Category'), chalk.bold('Count')],
    colWidths: [20, 10],
    style: { 'padding-left': 1, 'padding-right': 1, border: [], header: [], 'horizontal-mid': [] }
  });
  table.push(
    [chalk.red('Missing'), missingIssues.length],
    [chalk.yellow('Mismatched'), mismatchIssues.length],
    [chalk.blue('Outdated'), outdatedIssues.length],
    [chalk.green('Valid'), validIssues.length],
    [chalk.bold('Total Checked'), issues.length]
  );
  console.log(chalk.bold('Summary:'));
  console.log(table.toString());
  console.log('');

  const renderIssueSection = (title, issues, colorFn, messageFn) => {
    if (issues.length > 0) {
      console.log(colorFn.bold(title));
      issues.forEach(issue => {
        console.log(messageFn(issue, colorFn));
        if (issue.demandedBy && issue.demandedBy.length > 0) {
          console.log(chalk.gray('    Demanded by:'));
          issue.demandedBy.forEach(d => {
            console.log(chalk.gray(`      - ${d.name} (range: ${d.versionRange}${d.optional ? ', optional' : ''})`));
          });
        }
      });
      console.log('');
    }
  };

  renderIssueSection(
    '❌ Missing Peer Dependencies:',
    missingIssues,
    chalk.red,
    (issue, colorFn) => `  - ${chalk.cyan(issue.package)} (required by ${issue.requiredBy}) ` +
      `requires ${chalk.yellow(issue.requiredVersion)} but is ${colorFn('missing')}.`
  );

  renderIssueSection(
    '⚠️ Version Mismatch Peer Dependencies:',
    mismatchIssues,
    chalk.yellow,
    (issue, colorFn) => `  - ${chalk.cyan(issue.package)} (required by ${issue.requiredBy}) ` +
      `requires ${chalk.yellow(issue.requiredVersion)}, ` +
      `but ${colorFn(issue.installedVersion)} is installed.`
  );

  renderIssueSection(
    '⬆️ Outdated Peer Dependencies:',
    outdatedIssues,
    chalk.blue,
    (issue, colorFn) => `  - ${chalk.cyan(issue.package)} (required by ${issue.requiredBy}) ` +
      `has ${chalk.green(issue.installedVersion)} installed, but ${colorFn(issue.latestVersion)} is available.`
  );

  renderIssueSection(
    '✅ Valid Peer Dependencies:',
    validIssues,
    chalk.green,
    (issue, colorFn) => `  - ${chalk.cyan(issue.package)} (required by ${issue.requiredBy}) ` +
      `requires ${colorFn(issue.requiredVersion)} and ${colorFn(issue.installedVersion)} is installed.`
  );

  if (totalIssues > 0) {
    console.log(chalk.red.bold('Action Required:'));
    console.log('  Run `peer-dep-helper fix` to attempt to resolve these issues.');
  } else {
    console.log(chalk.green('All peer dependencies are correctly installed.'));
  }

  if (config.failOnIssues && totalIssues > 0) {
    console.log(chalk.red('Exiting with non-zero code due to --fail-on-issues flag.'));
    process.exit(1); // Exit with non-zero code for CI
  }
}

module.exports = {
  formatReport,
};