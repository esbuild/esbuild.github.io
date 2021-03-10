const child_process = require('child_process')
const assert = require('assert')
const yaml = require('js-yaml')
const path = require('path')
const util = require('util')
const fs = require('fs').promises
const contentDir = path.join(__dirname, '..', 'content')
const tempDir = path.join(__dirname, '..', '..', 'temp')

const colorRed = `\x1b[31m`
const colorGreen = `\x1b[32m`
const colorOff = `\x1b[0m`

const execAsync = util.promisify(child_process.exec)
const execFileAsync = util.promisify(child_process.execFile)
let nextTest = 0

const packageJSON = require('fs').readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
const version = JSON.parse(packageJSON).dependencies.esbuild

async function checkCommon(kind, text, value, callback) {
  const testDir = path.join(tempDir, `${nextTest++}`)

  try {
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(path.join(testDir, 'package.json'), '{}')

    if (value.in) {
      for (let name in value.in) {
        const absPath = path.join(testDir, name)
        await fs.mkdir(path.dirname(absPath), { recursive: true })
        await fs.writeFile(absPath, value.in[name])
      }
    }

    if (value.install) {
      for (let name in value.install) {
        let version = value.install[name];
        await execFileAsync('npm', ['i', `${name}@${version}`], { cwd: testDir, stdio: 'pipe' })
      }
    }

    if (!await callback({ testDir })) {
      return false
    }
  } catch (e) {
    console.log(`[${kind}] ${colorRed}${text}${colorOff}${('\n' + e).replace(/\n/g, '\n  ')}`)
    return false
  }

  // Only remove test output if the test was successful
  child_process.execFileSync('rm', ['-fr', testDir])

  console.log(`[${kind}] ${colorGreen}${text}${colorOff}`)
  return true
}

async function checkCli(text, value) {
  return await checkCommon('cli', text, value, async ({ testDir }) => {
    await execAsync(`npm i esbuild@${version}`, { cwd: testDir, stdio: 'pipe' })

    if (!Array.isArray(value.cli)) {
      await execAsync(value.cli, {
        cwd: testDir,
        stdio: 'pipe',
        env: { PATH: `${path.join(testDir, 'node_modules', '.bin')}:${process.env.PATH}` },
      })
      return true
    }

    let stdout = ''

    for (let item of value.cli) {
      if (item.$) {
        let result = await execAsync(item.$, {
          cwd: testDir,
          stdio: 'pipe',
          env: { PATH: `${path.join(testDir, 'node_modules', '.bin')}:${process.env.PATH}` }
        })

        // Ignore the build success message since it contains the build time which is non-deterministic
        if (!result.stderr.includes('⚡')) {
          assert.strictEqual(result.stderr, '')
        }

        stdout = result.stdout
      }

      else if (item.expect) {
        if (item.expect.startsWith('...\n')) {
          let expect = item.expect.slice(4)
          let text = stdout.slice(Math.max(0, stdout.length - expect.length))
          assert.strictEqual(text, expect)
        } else {
          assert.strictEqual(stdout, item.expect)
        }
      }

      else {
        throw new Error(`Invalid cli value: ${JSON.stringify(item)}`)
      }
    }

    return true
  })
}

async function checkJs(text, value) {
  return await checkCommon('js', text, value, async ({ testDir }) => {
    await execAsync(`npm i esbuild@${version}`, { cwd: testDir, stdio: 'pipe' })

    if (!Array.isArray(value.js)) {
      const mainPath = path.join(testDir, 'main.js')
      await fs.writeFile(mainPath, value.js)
      await execFileAsync('node', [mainPath], { cwd: testDir, stdio: 'pipe' })
      return true
    }

    let js = ''

    for (let items = value.js, i = 0; i < items.length; i++) {
      let item = items[i];

      if (item.$) {
        if (i + 1 < items.length && items[i + 1].expect) {
          js += `var $ = ${item.$.trim()};\n`
        } else {
          js += `${item.$.trim()};\n`
        }
      }

      else if (item.expect) {
        js += `require('assert').strictEqual(
          require('util').inspect($, { sorted: true, breakLength: 40 }),
          ${JSON.stringify(item.expect.trim())});\n`
      }

      else {
        throw new Error(`Invalid js value: ${JSON.stringify(item)}`)
      }
    }

    const mainPath = path.join(testDir, 'main.js')
    await fs.writeFile(mainPath, js)
    await execFileAsync('node', [mainPath], { cwd: testDir, stdio: 'pipe' })
    return true
  })
}

async function checkGo(text, value) {
  return await checkCommon('go', text, value, async ({ testDir }) => {
    await fs.writeFile(path.join(testDir, 'go.mod'), `
      module main
      go 1.16
      require (
        github.com/evanw/esbuild v${version}
      )
    `)
    await execAsync(`go mod download github.com/evanw/esbuild@v${version}`, { cwd: testDir, stdio: 'pipe' })
    await execAsync(`go mod download golang.org/x/sys`, { cwd: testDir, stdio: 'pipe' })

    const mainPath = path.join(testDir, 'main.go')
    await fs.writeFile(mainPath, value.go)
    await execAsync('go run main.go', { cwd: testDir, stdio: 'pipe' })

    await execAsync('git init', { cwd: testDir, stdio: 'pipe' })
    await execAsync('git add main.go', { cwd: testDir, stdio: 'pipe' })
    await execAsync('git commit -m temp', { cwd: testDir, stdio: 'pipe' })

    await execAsync('go fmt main.go', { cwd: testDir, stdio: 'pipe' })
    const fmt = (await fs.readFile(mainPath, 'utf8')).replace(/\t/g, '  ')
    await fs.writeFile(mainPath, fmt)

    let { stdout } = await execAsync('git diff --color', { cwd: testDir, stdio: 'pipe' })
    if (stdout !== '') {
      console.log(`[go] ${colorRed}${text}${colorOff}${('\n' + stdout).replace(/\n/g, '\n  ')}`)
      return false
    }

    return true
  })
}

async function main() {
  child_process.execFileSync('rm', ['-fr', tempDir])

  const data = yaml.safeLoad(await fs.readFile(path.join(contentDir, 'index.yml'), 'utf8'))
  const pages = Object.entries(data)
  let callbacks = []
  let failed = false

  // Load nested pages from other files
  for (let i = 0; i < pages.length; i++) {
    if (typeof pages[i][1] === 'string') {
      const contents = await fs.readFile(path.join(contentDir, pages[i][1]), 'utf8')

      // Make sure there aren't accidental links to "http://localhost" URLs
      // (can happen when copying and pasting links from a local dev server)
      let markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match
      while (match = markdownLinkRegex.exec(contents)) {
        if (match[2].startsWith('http://localhost:') && !match[1].replace(/<wbr>/g, '').startsWith('http://localhost:')) {
          const lines = contents.split('\n')
          const linesBefore = contents.slice(0, match.index).split('\n')
          const line = linesBefore.length
          throw new Error(`Link to localhost on line ${line} of ${pages[i][1]} is not permitted:\n\n` +
            `${lines[line - 1]}\n${' '.repeat(linesBefore.pop().length)}^`)
        }
      }

      pages[i][1] = yaml.safeLoad(contents)
    }
  }

  for (const [_, page] of pages) {
    let h2 = null
    let h3 = null
    let times = {}

    for (const obj of page.body) {
      const tag = Object.keys(obj)[0]
      const value = obj[tag]
      if (tag === 'h2') h2 = value, h3 = null
      if (tag === 'h3') h3 = value
      if (tag !== 'example' || value.noCheck) continue;
      let text = `${page.title}` + (h2 ? ` :: ${h2}` + (h3 ? ` :: ${h3}` : '') : '')
      if (times[text]) text += ` :: ${++times[text]}`
      times[text] = 1
      if (value.cli) callbacks.push(() => checkCli(text, value))
      if (value.js) callbacks.push(() => checkJs(text, value))
      if (value.go) callbacks.push(() => checkGo(text, value))
    }
  }

  // Do work items 2 at a time
  await new Promise(resolve => {
    let inFlight = 0
    function next() {
      let fn = callbacks.shift()
      if (fn) {
        inFlight++
        fn().then(success => {
          if (!success) failed = true
          inFlight--
          next()
        })
      } else if (inFlight === 0) {
        resolve()
      }
    }
    next()
    next()
  })

  try {
    await fs.rmdir(tempDir)
  } catch (e) {
    // If some tests failed, leave the output around
  }

  if (failed) throw new Error('Some tests failed')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
