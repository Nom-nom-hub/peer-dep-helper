#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { detectPeerDependencyIssues } = require('../lib/scan');
const { applyFixes } = require('../lib/fix');
const { formatReport } = require('../lib/output');
const { loadConfig } = require('../lib/config');
const pkg = require('../package.json');
const chalk = require('chalk');
const boxen = require('boxen').default;
const ora = require('ora').default;
const { loadThemeConfig, listThemes, getThemePreset } = require('../lib/utils');

const VALID_BOXEN_STYLES = ['single', 'double', 'round', 'bold', 'singleDouble', 'doubleSingle', 'classic', 'arrow'];
function getBoxenStyle(style) {
  return VALID_BOXEN_STYLES.includes(style) ? style : 'single';
}

const CSS_COLOR_KEYWORDS = [
  'black','red','green','yellow','blue','magenta','cyan','white','gray','grey',
  'maroon','olive','lime','teal','navy','fuchsia','purple','silver','aqua',
  'orange','gold','pink','brown','beige','coral','crimson','indigo','ivory','khaki','lavender','limegreen','mint','plum','salmon','tan','violet','wheat','turquoise','azure','aliceblue','antiquewhite','aquamarine','bisque','blanchedalmond','blueviolet','burlywood','cadetblue','chartreuse','chocolate','cornflowerblue','cornsilk','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkgrey','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','gainsboro','ghostwhite','goldenrod','greenyellow','honeydew','hotpink','indianred','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen','lightgrey','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue','lightyellow','limegreen','linen','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mistyrose','moccasin','navajowhite','oldlace','olivedrab','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','powderblue','rosybrown','royalblue','saddlebrown','sandybrown','seagreen','seashell','sienna','skyblue','slateblue','slategray','slategrey','snow','springgreen','steelblue','thistle','tomato','yellowgreen'
];
function safeChalkKeyword(color, fallback = 'white') {
  if (typeof color === 'string' && CSS_COLOR_KEYWORDS.includes(color.toLowerCase())) {
    return chalk.keyword(color);
  }
  return chalk.keyword(fallback);
}

async function main() {
  const argv = program;

  argv
    .name('peer-dep-helper')
    .description('A CLI tool to detect, audit, and fix peer dependency issues.')
    .version(pkg.version, '--version', 'output the current version')
    .option('--json', 'Output report as JSON')
    .option('--silent', 'Suppress all output except errors')
    .option('--cwd <path>', 'Custom working directory', process.cwd())
    .option('--strategy <strategy>', 'Version resolution strategy (strict, compatible, latest)', 'compatible')
    .option('--dry-run', 'Show what would be installed/changed without making any changes')
    .option('--fail-on-issues', 'Exit with a non-zero code if issues are found (for CI pipelines)')
    .option('--debug', 'Enable debug output')
    .option('--theme-preset <preset>', 'Use a predefined theme preset')
    .option('--theme-primary <color>', 'Primary theme color')
    .option('--theme-secondary <color>', 'Secondary theme color')
    .option('--box-style <style>', 'Box border style (round, single, double, classic, etc.)')
    .option('--no-emoji', 'Disable emoji in output')
    .option('--minimal', 'Minimal output (no color, no boxes, no emoji)');

  // Print beautiful header
  console.log(themedBox(
    themedSectionHeader('🔍 Peer Dependency Helper') + '\n' +
    themedGray('Audit and fix peer dependency issues with ease'),
    null,
    { padding: 1, borderColor: 'cyan', borderStyle: getBoxenStyle('round'), align: 'center' }
  ));

  argv.command('audit')
    .description('Print all peer dependency issues')
    .option('--fix', 'Automatically fix issues (for audit command)')
    .action(async (options) => {
      const config = await loadConfig(argv.opts(), options);
      const cwd = path.resolve(config.cwd);
      if (debugEnabled) console.log('DEBUG: CLI resolved cwd', cwd);

      if (config.silent) {
        // console.log = () => {};
        // console.warn = () => {};
        // console.error = () => {};
      }

      try {
        // Show scanning spinner
        const scanSpinner = ora(themedBlue('🔍 Scanning for peer dependency issues...')).start();
        const issues = await detectPeerDependencyIssues(cwd, config, argv.args);
        scanSpinner.succeed(themedGreen('✅ Scan complete!'));

        const hasIssues = issues.some(issue => issue.status !== 'valid');
        
        // Print section header
        console.log('\n' + themedSectionHeader('📊 Audit Report', 'blue'));

        formatReport(issues, config);

        if (!hasIssues && issues.length === 0 && config.ignore && config.ignore.length > 0) {
          console.log(themedYellow('⚠️  No issues found after applying ignore list.'));
        }

        if (config.fix && hasIssues) {
          console.log('\n' + themedSectionHeader('🔧 Attempting Automatic Fix', 'magenta'));
          
          const fixSpinner = ora(themedMagenta('🔧 Applying fixes...')).start();
          await applyFixes(issues, config);
          fixSpinner.succeed(themedGreen('✅ Fixes applied!'));
          
          console.log(themedBlue('🔄 Re-auditing...'));
          const updatedIssues = await detectPeerDependencyIssues(cwd, config, argv.args);
          formatReport(updatedIssues, config);
        }

        if (config.failOnIssues && hasIssues) {
          process.exit(1);
        }

        if (issues.length === 0 || issues.every(issue => issue.status === 'valid')) {
          console.log(themedGreen(themedSectionHeader('✅ No peer dependency issues found.') + '\n' +
            themedGray('🎉 Your project is in perfect shape!')));
          
          // Print helpful tip
          console.log(themedCyan(themedTip('💡 Tip: ') + themedGray('Run ') + 
            themedCyanBold('peer-dep-helper fix') + 
            themedGray(' to automatically resolve any future issues.')));
          return;
        }

        // If issues found, show error box with action tip
        if (hasIssues) {
          console.log(themedRed(themedSectionHeader('❌ Peer Dependency Issues Found!') + '\n' +
            themedYellow('🔧 Run ') + themedCyanBold('peer-dep-helper fix') + 
            themedYellow(' to attempt an automatic fix.')));
        }
      } catch (error) {
        console.log(themedRed(themedSectionHeader('💥 Error Occurred!') + '\n' +
          themedRed(error.message)));
        process.exit(1);
      }
    });

  argv.command('fix')
    .description('Install or suggest the correct versions of missing or mismatched peers')
    .option('--write', 'Write fixed dependencies to package.json')
    .option('--only <packages...>', 'Fix only specified packages (comma-separated)')
    .action(async (options) => {
      const config = await loadConfig(argv.opts(), options);
      const cwd = path.resolve(config.cwd);
      if (debugEnabled) console.log('DEBUG: CLI resolved cwd', cwd);

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
        // Show scanning spinner
        const scanSpinner = ora(themedBlue('🔍 Scanning for peer dependency issues...')).start();
        let issues = await detectPeerDependencyIssues(cwd, config, argv.args);
        scanSpinner.succeed(themedGreen('✅ Scan complete!'));

        // Filter all issues by --only for all statuses if set
        if (config.only && config.only.length > 0) {
          issues = issues.filter(issue => config.only.includes(issue.package));
        }
        let fixableIssues = issues.filter(issue => issue.status === 'missing' || issue.status === 'version_mismatch');
        if (debugEnabled) console.log('DEBUG: bin/index.js - fixableIssues after --only filter:', fixableIssues.map(i => i.package));

        if (fixableIssues.length === 0) {
          console.log(themedGreen(themedSectionHeader('✅ No fixable peer dependency issues found.') + '\n' +
            themedGray('🎉 All peer dependencies are properly configured!')));
          
          // Print helpful tip
          console.log(themedCyan(themedTip('💡 Tip: ') + themedGray('Run ') + 
            themedCyanBold('peer-dep-helper audit') + 
            themedGray(' to see a detailed report of all peer dependencies.')));
          return;
        }

        if (config.dryRun) {
          console.log('\n' + themedYellow(themedBold('🔍 Dry Run Mode')));
          
          // Call applyFixes in dry-run mode to get the "would install" output
          await applyFixes(fixableIssues, { ...config, dryRun: true });
          return;
        }

        console.log('\n' + themedSectionHeader('🔧 Applying Fixes', 'magenta'));
        
        const fixSpinner = ora(themedMagenta('🔧 Installing and updating dependencies...')).start();
        await applyFixes(fixableIssues, config);
        fixSpinner.succeed(themedGreen('✅ Fixes applied successfully!'));
        
        if (!config.dryRun) {
          console.log(themedBlue('🔄 Re-auditing to verify fixes...'));
          const updatedIssues = await detectPeerDependencyIssues(cwd, config, argv.args);
          const hasIssues = updatedIssues.some(issue => issue.status !== 'valid');
          // Only show updated issues for the filtered packages if --only is used
          let issuesToReport = updatedIssues;
          if (config.only && config.only.length > 0) {
            issuesToReport = updatedIssues.filter(issue => config.only.includes(issue.package));
          }
          
          console.log('\n' + themedSectionHeader('📊 Post-Fix Report', 'blue'));
          
          formatReport(issuesToReport, config);
          
          if (config.failOnIssues && hasIssues) {
            process.exit(1);
          }
          
          // Print success message
          if (!hasIssues) {
            console.log(themedGreen(themedSectionHeader('🎉 All issues resolved successfully!') + '\n' +
              themedGray('✨ Your peer dependencies are now properly configured.')));
          }
        }
      } catch (error) {
        console.log(themedRed(themedSectionHeader('💥 Fix Failed!') + '\n' +
          themedRed(error.message)));
        process.exit(1);
      }
    });

  const themeCmd = argv.command('theme').description('Manage CLI themes');
  themeCmd
    .command('list')
    .description('List all available theme presets')
    .action(() => {
      const themes = listThemes();
      console.log(boxen(
        chalk.cyan.bold('🎨 Available Theme Presets') + '\n\n' +
        themes.map(theme => 
          chalk.bold(theme.name) + ' (' + theme.key + ')\n' +
          chalk.gray(theme.description) + '\n' +
          chalk.gray(`Colors: ${theme.primaryColor} + ${theme.secondaryColor} | Box: ${theme.boxStyle} | Emoji: ${theme.useEmojis ? 'Yes' : 'No'} | Minimal: ${theme.minimal ? 'Yes' : 'No'}`)
        ).join('\n\n'),
        { padding: 1, borderColor: 'cyan', borderStyle: getBoxenStyle('round'), align: 'left' }
      ));
    });
  themeCmd
    .command('preview <preset>')
    .description('Preview a theme preset')
    .action((preset) => {
      const themePreset = getThemePreset(preset);
      if (!themePreset) {
        console.error(chalk.red(`Theme preset '${preset}' not found. Use 'peer-dep-helper theme list' to see available presets.`));
        process.exit(1);
      }

      // Use the preset directly instead of loadThemeConfig
      const previewTheme = {
        ...themePreset,
        preset: preset
      };
      console.log(boxen(
        safeChalkKeyword(previewTheme.primaryColor).bold(`${previewTheme.useEmojis ? '🎨' : ''} ${themePreset.name} Theme Preview`) + '\n' +
        chalk.gray(themePreset.description) + '\n\n' +
        safeChalkKeyword(previewTheme.secondaryColor)('Sample output with this theme:') + '\n' +
        chalk.gray('• Primary color: ' + previewTheme.primaryColor) + '\n' +
        chalk.gray('• Secondary color: ' + previewTheme.secondaryColor) + '\n' +
        chalk.gray('• Box style: ' + previewTheme.boxStyle) + '\n' +
        chalk.gray('• Emoji: ' + (previewTheme.useEmojis ? 'Enabled' : 'Disabled')) + '\n' +
        chalk.gray('• Minimal: ' + (previewTheme.minimal ? 'Yes' : 'No')),
        { padding: 1, borderColor: previewTheme.primaryColor, borderStyle: getBoxenStyle(previewTheme.boxStyle), align: 'left' }
      ));
      // Show sample success message
      console.log(boxen(
        safeChalkKeyword(previewTheme.primaryColor).bold(`${previewTheme.useEmojis ? '✅' : ''} Sample Success Message`) + '\n' +
        chalk.gray('This is how success messages will look with this theme.'),
        { padding: 1, borderColor: 'green', borderStyle: getBoxenStyle(previewTheme.boxStyle), align: 'center' }
      ));
      // Show sample tip
      console.log(boxen(
        safeChalkKeyword(previewTheme.secondaryColor)(`${previewTheme.useEmojis ? '💡' : ''} Sample Tip`) + '\n' +
        chalk.gray('This is how tips will look with this theme.'),
        { padding: 1, borderColor: previewTheme.secondaryColor, borderStyle: getBoxenStyle(previewTheme.boxStyle), align: 'center' }
      ));
    });

  argv.parse(process.argv);
}

const debugEnabled = program.opts().debug;

// Load theme config (merge CLI flags)
const theme = loadThemeConfig({
  preset: program.opts().themePreset,
  primaryColor: program.opts().themePrimary,
  secondaryColor: program.opts().themeSecondary,
  boxStyle: program.opts().boxStyle,
  useEmojis: program.opts().emoji,
  minimal: program.opts().minimal
});

function themedGray(msg)    { return theme.minimal ? msg : chalk.gray(msg); }
function themedBlue(msg)    { return theme.minimal ? msg : chalk.blue(msg); }
function themedYellow(msg)  { return theme.minimal ? msg : chalk.yellow(msg); }
function themedCyan(msg)    { return theme.minimal ? msg : chalk.cyan(msg); }
function themedCyanBold(msg){ return theme.minimal ? msg : chalk.cyan.bold(msg); }
function themedMagenta(msg) { return theme.minimal ? msg : chalk.magenta(msg); }
function themedRed(msg)     { return theme.minimal ? msg : chalk.red(msg); }
function themedGreen(msg)   { return theme.minimal ? msg : chalk.green(msg); }
function themedBold(msg)    { return theme.minimal ? msg : chalk.bold(msg); }

function themedBox(message, color, opts = {}) {
  if (theme.minimal) return message;
  return boxen(
    (color ? chalk[color].bold(message) : message),
    { padding: 1, borderColor: color || theme.primaryColor, borderStyle: getBoxenStyle(theme.boxStyle), align: 'center', ...opts }
  );
}
function themedSectionHeader(message, color) {
  if (theme.minimal) return `\n${message}\n`;
  return boxen(
    (color ? chalk[color].bold(message) : message),
    { padding: 1, borderColor: color || theme.primaryColor, borderStyle: getBoxenStyle(theme.boxStyle), align: 'center' }
  );
}
function themedTip(message) {
  if (theme.minimal) return message;
  return boxen(
    safeChalkKeyword(theme.secondaryColor)(message),
    { padding: 1, borderColor: theme.secondaryColor, borderStyle: getBoxenStyle(theme.boxStyle), align: 'center' }
  );
}
function themedError(message) {
  if (theme.minimal) return message;
  return boxen(
    chalk.red.bold(message),
    { padding: 1, borderColor: 'red', borderStyle: getBoxenStyle(theme.boxStyle), align: 'center' }
  );
}
function themedSuccess(message) {
  if (theme.minimal) return message;
  return boxen(
    chalk.green.bold(message),
    { padding: 1, borderColor: 'green', borderStyle: getBoxenStyle(theme.boxStyle), align: 'center' }
  );
}
function themedEmoji(emoji, fallback = '') {
  return theme.useEmojis === false || theme.minimal ? fallback : emoji;
}

main();