const chalk = require('chalk')
const clipboardy = require('clipboardy')
const cp = require('child_process')
const GitUrlParse = require('git-url-parse');

function getFromGitConfig(entryLabel) {
  const str = cp.execSync(`git config ${entryLabel}`).toString()

  return str.substring(str, str.length - 1)
}

function getOriginDomain() {
  const str = cp.execSync(`git remote get-url origin`).toString()
  const url = GitUrlParse(str.substring(str, str.length - 1))

  return url.resource
}

const keyId = getFromGitConfig(`user.signingkey`)
const key = cp.execSync(`gpg --armor --export ${keyId}`).toString()
clipboardy.writeSync(key);
console.log(chalk.gray(key))

console.log(chalk.cyan.bold('The requested key has been copied to your clipboard'))

const domain = getOriginDomain()
const prefix = chalk.green.bold(`To add your key, go to`)

function outputSettingsLink(url) {
  console.log(prefix, chalk.bold.yellow(url))
  console.log('')
}

if (domain.indexOf('github') != -1) {
  outputSettingsLink(`https://${domain}/settings/keys`)
} else if (domain.indexOf('gitlab') != -1) {
  outputSettingsLink(`https://${domain}/profile/gpg_keys`)
}
