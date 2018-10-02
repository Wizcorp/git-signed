#!/usr/bin/env node

const chalk = require('chalk')
const cp = require('child_process')
const readline = require('readline')

// Required to access git's copy of gpg
if (process.platform === 'win32') {
  process.env.PATH += ';C:\\Program Files\\Git\\usr\\bin\\'
}

function logFlag(flag, desc) {
  console.log(chalk.green.bold(flag), desc)
}

function showHelpAndExit(flag) {
  console.log(chalk.cyan.bold(`Usage: git-signed [--help|--join|--sync|--export|--trust-commits|commit hash])`))
  console.log(``)

  logFlag(`  --help`, `         Print this help screen`)
  logFlag(`  --add`, `          Add yourself as a contributor to the project`)
  logFlag(`  --sync`, `         Import GPG keys from all contributors`)
  logFlag(`  --trust-commits`, `Check if commits were made with certified keys (default false)`)
  logFlag(`  [commit hash]`, `  Check history from this commit onward (optional)`)
  console.log(``)

  console.log(chalk.yellow.bold(`If no commit hash is provided, the entire
git history of the repository will be scanned`))

  process.exit(flag === '--help' ? 0 : 1)
}

function showGuide() {
  console.log(chalk.yellow.bold(`If your username is in the list, make sure`))
  console.log(chalk.yellow.bold(`that you have joined the project correctly:`))
  console.log('')
  console.log(chalk.cyan.bold(`  ./node_modules/.bin/git-signed --join`))
  console.log('')
  console.log(chalk.yellow.bold('Also, make sure to sync the pubkeys from'))
  console.log(chalk.yellow.bold('all the contributors on the project:'))
  console.log('')
  console.log(chalk.cyan.bold(`  ./node_modules/.bin/git-signed --sync`))
  console.log('')
  console.log(
    chalk.yellow.bold(`For more information, see`),
    chalk.cyan.bold('https://www.npmjs.com/package/git-signed')
  )
  console.log('')
}

// Command and arguments
const argOne = process.argv[2]

// If untrusted commits found, program shall exit
var trustCommits = false

switch (argOne) {
  case '--join':
  case '--sync':
  case '--export':
    require(`./commands/${argOne.substring(2)}`)
    break

  default:
    if (argOne === '--trust-commits') {
      trustCommits = true
    } else if (argOne && argOne[0] === '-') {
      showHelpAndExit(argOne[0])
    }

    const checkAfter = argOne
    const command = 'git'
    const args = [
      'log',
      '--no-merges',
      '--pretty=format:%G? %h %aN\t%s'
    ]

    if (checkAfter && checkAfter !== '--trust-commits') {
      args.push(`${checkAfter}..`)
    }

    // We start the process - the subprocess' stderr is piped directly to
    // our current process, and if the subprocess exits with an error we exit
    // immediately
    const proc = cp.spawn(command, args)
    proc.stderr.pipe(process.stderr)
    proc.on('exit', function (code) {
      if (code > 0) {
        process.exit(code)
      }
    })

    // We will store all unsigned commits here
    let unsignedCommits = []

    // We will store all invalidated commits here
    let invalidatedCommits = []

    const rl = readline.createInterface({
      input: proc.stdout
    })

    // We parse the subprocess' stdout line by line, and
    // look for lines with no signatures or invalid signatures
    rl.on('line', function (data) {
      var line = data.toString()
      if (line.substring(0, 2) === 'N ') {
        unsignedCommits.push(line.substring(2))
      }
      if (line.substring(0, 2) !== 'G ') {
        invalidatedCommits.push(line.substring(2))
      }
    })

    // On readline close, make sure we have no
    // unsigned commits
    rl.on('close', function () {
      if (invalidatedCommits.length > 0) {
        console.error('')
        console.error(chalk.gray('The following commits are not validated'))
        console.error(chalk.gray('---------------------------------------'))
        console.error('')

        invalidatedCommits.forEach((line) => {
          const [ details, title ] = line.split('\t')
          const [ hash, user ] = details.split(' ')

          console.error(chalk.white(hash), chalk.white(user) + '\t' + chalk.gray(title))
        })
        console.error('')
        console.error(chalk.gray('----------------------------------------'))

        if (trustCommits) {
          console.error('')
          showGuide()
          process.exit(1)
        }
      }

      if (unsignedCommits.length > 0) {
        console.error('')
        console.error(chalk.red.bold('The following commits are not signed'))
        console.error(chalk.red.bold('------------------------------------'))
        console.error('')


        unsignedCommits.forEach((line) => {
          const [ details, title ] = line.split('\t')
          const [ hash, user ] = details.split(' ')

          console.error(chalk.red.bold(hash), chalk.yellow.bold(user) + '\t' + chalk.gray(title))
        })

        console.error('')
        console.error(chalk.red.bold('------------------------------------'))

        console.error('')
        showGuide()

        process.exit(1)
      }

      console.log('')
      console.log(chalk.green.bold('!! All commits are signed! Good job! !!'))
      console.log('')
    })
}
