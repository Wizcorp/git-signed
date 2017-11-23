const chalk = require('chalk')
const cp = require('child_process')
const path = require('path')

const pkgDataPath = path.join(process.cwd(), 'package.json')
const pkgData = require(pkgDataPath)

if (!pkgData.contributors) {
  return
}

for (const { name, key } of pkgData.contributors) {
  if (!key) {
    continue
  }

  const [ server, keyName ] = key.split('#')

  if (!server || !keyName) {
    throw new Error('Contributor ${name} key field is invalid')
  }

  console.log(chalk.cyan.bold(`Fetching key for contributor ${name}`))
  const out = cp.execSync(`gpg --keyserver ${server} --recv ${keyName}`)
  console.log(out.toString())
}
