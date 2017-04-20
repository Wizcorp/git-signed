#!/usr/bin/env node

const cp = require('child_process')
const readline = require('readline')

// Command and arguments
const checkAfter = process.argv[2]
const command = 'git'
const args = [
  'log',
  '--no-merges',
  '--pretty=format:%G? %h %aN\t%s'
]

if (checkAfter) {
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
})

// On readline close, make sure we have no
// unsigned commits
rl.on('close', function () {
  if (unsignedCommits.length > 0) {
    console.error('')
    console.error('The following commits are not signed')
    console.error('------------------------------------')
    console.error('')
    unsignedCommits.forEach((line) => console.error(line))
    console.error('')
    process.exit(1)
  }
})
