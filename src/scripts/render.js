const yaml = require('js-yaml')
const path = require('path')
const md = require('markdown-it')({ html: true })
const hljs = require('highlight.js')
const esbuild = require('esbuild')
const fs = require('fs')
const os = require('os')

const repoDir = path.dirname(path.dirname(__dirname))
const scriptsDir = path.join(repoDir, 'src', 'scripts')
const contentDir = path.join(repoDir, 'src', 'content')
const outDir = path.join(repoDir, 'out')
const linkDir = path.join(scriptsDir, 'link')
const linkOutDir = path.join(outDir, 'link')

const target = ['chrome1', 'safari1', 'firefox1', 'edge1']

// Replace "CURRENT_ESBUILD_VERSION" with the currently-installed version
// of esbuild. This should be reasonably up to date.
const CURRENT_ESBUILD_VERSION = require('../../package.json').dependencies.esbuild;

function minifyJS(js) {
  return esbuild.transformSync(js, { target, minify: true }).code.trim()
}

function minifyCSS(css) {
  return esbuild.transformSync(css, { loader: 'css', target, minify: true }).code.trim()
}

fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(scriptsDir, 'favicon.svg'), path.join(outDir, 'favicon.svg'))

const minifiedCSS = minifyCSS(fs.readFileSync(path.join(scriptsDir, 'style.css'), 'utf8'))
const minifiedJS = minifyJS(fs.readFileSync(path.join(scriptsDir, 'script.js'), 'utf8'))

for (const link of fs.readdirSync(linkDir)) {
  if (link.startsWith('.') || !link.endsWith('.html')) continue
  const outPath = path.join(linkOutDir, link.slice(0, -5), 'index.html')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.copyFileSync(path.join(linkDir, link), outPath)
}

const data = yaml.safeLoad(fs.readFileSync(path.join(contentDir, 'index.yml'), 'utf8'))
const pages = Object.entries(data)

for (let i = 0; i < pages.length; i++) {
  // Load nested pages from other files
  if (typeof pages[i][1] === 'string') {
    pages[i][1] = yaml.safeLoad(fs.readFileSync(path.join(contentDir, pages[i][1]), 'utf8'))
  }

  // Convert body tags into an easier to parse format
  pages[i][1].body = pages[i][1].body.map(obj => {
    let tag = Object.keys(obj)[0]
    return { tag, value: obj[tag] }
  })
}

let disableLinkValidator = false

function stripTagsFromMarkdown(markdown) {
  const old = disableLinkValidator
  disableLinkValidator = true
  const result = md.renderInline(markdown.trim()).replace(/<[^>]*>/g, '')
  disableLinkValidator = old
  return result
}

function toID(text) {
  text = stripTagsFromMarkdown(text)
  return text.toLowerCase().replace(/[^\w \-]/g, '').replace(/[ ]/g, '-')
}

function escapeHTML(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(text) {
  return escapeHTML(text).replace(/'/g, '&apos;').replace(/"/g, '&quot;')
}

function generateNav(key) {
  let structure = []

  for (let [k, page] of pages) {
    if (k === 'index') continue
    let h2s = []
    let root = { k, title: page.title, h2s }
    structure.push(root)

    let h3s
    for (let { tag, value } of page.body) {
      let cssID

      // Strip off a trailing CSS id
      if (tag.includes('#')) {
        let i = tag.indexOf('#')
        cssID = tag.slice(i + 1)
        tag = tag.slice(0, i)
      }

      if (tag === 'h2') {
        h3s = []
        h2 = { cssID: cssID || toID(value), value, h3s }
        h2s.push(h2)
      } else if (tag === 'h3' && k === key) {
        h3s.push({ cssID: cssID || toID(value), value })
      }
    }
  }

  let nav = []
  nav.push(`<li><a href="/try/">Try in the browser</a></li>`)

  for (let { k, title, h2s } of structure) {
    let target = k === key ? '' : `/${escapeAttribute(k)}/`

    if (h2s.length > 0) {
      nav.push(`<li>`)
      nav.push(`<a href="/${escapeAttribute(k)}/">${md.renderInline(title)}</a>`)
      nav.push(`<ul class="h2">`)

      for (let { cssID, value, h3s } of h2s) {
        let a = `<a href="${target}#${escapeAttribute(cssID)}">${md.renderInline(value)}</a>`

        if (h3s.length > 0) {
          nav.push(`<li${k === key ? ` id="nav-${escapeAttribute(cssID)}"` : ''}>`)
          nav.push(a)
          nav.push(`<ul class="h3">`)

          for (let { cssID, value } of h3s) {
            let a = `<a href="#${escapeAttribute(cssID)}">${md.renderInline(value)}</a>`
            nav.push(`<li id="nav-${escapeAttribute(cssID)}">${a}</li>`)
          }

          nav.push(`</ul>`)
          nav.push(`</li>`)
        }

        else {
          nav.push(`<li${k === key ? ` id="nav-${escapeAttribute(cssID)}"` : ''}>${a}</li>`)
        }
      }

      nav.push(`</ul>`)
      nav.push(`</li>`)
    }

    else {
      nav.push(`<li><a href="/${escapeAttribute(k)}/">${escapeHTML(title)}</a></li>`)
    }
  }

  nav.push(`<li><a href="/analyze/">Bundle Size Analyzer</a></li>`)
  return nav.join('')
}

function renderBenchmarkSVG(entries, { dark }) {
  let times = Object.entries(entries)
  let max = 0
  for (let [_, time] of times) {
    max = Math.max(max, time)
  }

  let topMargin = 20
  let leftWidth = 120
  let barHeight = 20
  let barMargin = 3
  let labelMargin = 8
  let bottomHeight = 30
  let rightWidth = 800 - leftWidth
  let topHeight = times.length * barHeight
  let width = leftWidth + rightWidth
  let height = topMargin + topHeight + bottomHeight
  let horizontalScale = (rightWidth - 100) / max
  let horizontalStep = max > 90 ? 30 : max > 30 ? 10 : 5
  let textFill = dark ? ' fill="#C9D1D9"' : ''
  let svg = []

  // Begin chart
  svg.push(`<svg width="${width}" height="${height}" fill="black" font-family="sans-serif" font-size="13px" xmlns="http://www.w3.org/2000/svg">`)

  // Horizontal axis bars
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = leftWidth + i * horizontalScale
    svg.push(`  <rect x="${x}" y="${topMargin}" width="1" height="${topHeight}" fill="#7F7F7F" fill-opacity="0.25"/>`)
  }

  // Bars
  for (let i = 0; i < times.length; i++) {
    let [name, time] = times[i]
    let y = topMargin + i * barHeight
    let w = time * horizontalScale
    let h = barHeight
    let barY = y + barMargin
    let barH = h - 2 * barMargin
    let bold = i === 0 ? ' font-weight="bold"' : ''
    let label = stripTagsFromMarkdown(name)
    svg.push(`  <rect x="${leftWidth}" y="${barY}" width="${w}" height="${barH}" fill="#FFCF00"/>`)
    svg.push(`  <text x="${leftWidth - labelMargin}" y="${y + h / 2}" text-anchor="end" dominant-baseline="middle"${bold}${textFill}>${label}</text>`)
    svg.push(`  <text x="${leftWidth + labelMargin + w}" y="${y + h / 2}" dominant-baseline="middle"${bold}${textFill}>${escapeHTML(time.toFixed(2))}s</text>`)
  }

  // Horizontal labels
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = leftWidth + i * horizontalScale
    let y = topMargin + topHeight + labelMargin / 2
    svg.push(`  <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="hanging"${textFill}>${escapeHTML(i + 's')}</text>`)
  }

  // End chart
  svg.push(`</svg>`, '')
  return svg.join('\n')
}

function renderBenchmark(entries, { leftWidth, bench, animated }) {
  let times = Object.entries(entries)
  let max = 0
  for (let [_, time] of times) {
    max = Math.max(max, time)
  }

  let barHeight = 20
  let barMargin = 3
  let labelMargin = 8
  let bottomHeight = 30
  let rightWidth = 800 - leftWidth
  let topHeight = times.length * barHeight
  let width = leftWidth + rightWidth
  let height = topHeight + bottomHeight
  let horizontalScale = (rightWidth - 100) / max
  let horizontalStep = max > 90 ? 30 : max > 30 ? 10 : 5
  let tags = []

  // Style tag
  if (animated) {
    let css = `
      @keyframes ${bench}-anim {
        0% { left: 0; }
        100% { left: ${(100 * max * horizontalScale / rightWidth).toFixed(3)}%; }
      }
      #${bench}-progress {
        animation: ${bench}-anim ${max}s linear;
        left: ${(100 * max * horizontalScale / rightWidth).toFixed(3)}%;
      }
    `
    for (let i = 0; i < times.length; i++) {
      let [_, time] = times[i]
      css += `
        .${bench}-bar${i} {
          animation: scale-bar ${time}s linear;
          transform-origin: left;
        }
      `
    }
    tags.push(`<style>${minifyCSS(css)}</style>`)
  }

  // Begin chart
  tags.push(`<figure class="bench" style="position:relative;max-width:${width}px;height:${height}px;font-size:13px;line-height:${barHeight}px;">`)
  tags.push(`<div style="position:absolute;left:${leftWidth}px;top:0;right:0;height:${height - bottomHeight}px;">`)

  // Horizontal axis bars
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = (100 * i * horizontalScale / rightWidth).toFixed(2) + '%'
    tags.push(`<div style="position:absolute;left:${x};top:0;width:1px;bottom:0;background:rgba(127,127,127,0.25);"></div>`)
  }

  // Bars
  for (let i = 0; i < times.length; i++) {
    let [name, time] = times[i]
    let barID = `${bench}-bar${i}`
    let y = i * barHeight
    let w = (100 * time * horizontalScale / rightWidth).toFixed(2) + '%'
    let h = barHeight
    let barY = y + barMargin
    let barH = h - 2 * barMargin
    let bold = i === 0 ? 'font-weight:bold;' : ''
    tags.push(`<div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:rgba(191,191,191,0.2);"></div>`)
    tags.push(`<div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:#FFCF00;" class="${barID}"></div>`)
    tags.push(`<div style="position:absolute;right:100%;top:${y}px;width:${leftWidth}px;height:${h}px;` +
      `text-align:right;white-space:nowrap;margin-right:${labelMargin}px;${bold}">${md.renderInline(name.trim())}</div>`)
    tags.push(`<div style="position:absolute;left:${w};top:${y}px;height:${h}px;` +
      `margin-left:${labelMargin}px;${bold}">${escapeHTML(time.toFixed(2))}s</div>`)
  }

  // Horizontal labels
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = (100 * i * horizontalScale / rightWidth).toFixed(2) + '%'
    let y = topHeight + labelMargin / 2
    tags.push(`<div style="position:absolute;left:${x};top:${y}px;width:50px;margin-left:-25px;text-align:center;">${escapeHTML(i + 's')}</div>`)
  }

  // End chart
  if (animated) {
    let y = topHeight + labelMargin / 2
    tags.push(`<div id="${bench}-progress" class="progress" style="position:absolute;top:${y}px;width:50px;margin-left:-25px;text-align:center;"></div>`)
  }
  tags.push(`</div>`)

  // Animate the time
  if (animated) {
    tags.push(`<script>${minifyJS(`
      (() => {
        var el = document.getElementById('${bench}-progress')
        var interval
        var anim

        var update = () => {
          anim ||= el.getAnimations()[0]

          if (anim) {
            el.textContent = Math.floor(anim.timeline.currentTime / 1000) + 's'

            if (anim.playState === 'finished') {
              clearInterval(interval)
              el.style.display = 'none'
            }
          }
        }

        if (el.getAnimations) {
          interval = setInterval(update, 250)
          update()
        }
      })()
    `)}</script>`)
  }

  tags.push(`</figure>`)
  return tags.join('')
}

function renderExample(kind, value) {
  let hljsLang = kind === 'cli' || kind === 'unix' || kind === 'windows' ? 'bash' : kind;
  if (value instanceof Array) {
    let lines = []
    for (let item of value) {
      if (item.$) {
        let html = hljs.highlight(hljsLang, item.$).value
        html = html.replace(/CURRENT_ESBUILD_VERSION/g, CURRENT_ESBUILD_VERSION)
        lines.push(`<span class="repl-in">${html}</span>`)
      } else if (item.expect) {
        lines.push(`<span class="repl-out">${escapeHTML(item.expect)}</span>`)
      } else {
        throw new Error('Internal error')
      }
    }
    return lines.join('')
  }
  return hljs.highlight(hljsLang, value).value
}

// Format the example log messages automatically so they are kept up to date
async function formatMessagesInText(text) {
  const handler = async (_, input, options) => {
    const evalExpr = x => new Function('return ' + x.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))()
    input = evalExpr(input)
    options = evalExpr(options)

    const { sourcefile, loader, ...remainingOptions } = options
    let warnings = []
    let errors = []

    try {
      const buildOptions = {
        logLevel: 'silent',
        write: false,
      }

      if (typeof input === 'string') {
        ({ warnings } = await esbuild.build({
          stdin: { contents: input, sourcefile, loader },
          ...buildOptions,
          ...remainingOptions,
        }))
      }

      else {
        const dir = path.join(os.tmpdir(), `esbuild-render-${Math.random().toString(36).slice(2)}`)
        fs.mkdirSync(dir)
        try {
          for (const key in input) {
            const file = path.join(dir, key)
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, input[key])
          }
          ({ warnings } = await esbuild.build({
            entryPoints: Object.keys(input).slice(0, 1),
            absWorkingDir: dir,
            ...buildOptions,
            ...options,
          }))
        } finally {
          fs.rmSync(dir, { recursive: true })
        }
      }
    } catch (e) {
      ({ warnings, errors } = e)
    }

    let result = escapeHTML([].concat(
      await esbuild.formatMessages(warnings, { kind: 'warning', terminalWidth: 100, color: true }),
      await esbuild.formatMessages(errors, { kind: 'error', terminalWidth: 100, color: true }),
    ).join('').trim())

    if (result === '') {
      const indent = x => ('\n' + x).replace(/\n/g, '\n  ')
      input = indent(typeof input === 'string' ? input : JSON.stringify(input, null, 2))
      options = indent(JSON.stringify(options, null, 2))
      throw new Error(`Unexpectedly got no warnings for this code:\n${input}\n\nwith these options:\n${options}\n`)
    }

    // Interpret the terminal color escape codes
    result = '<span>' + result.replace(/\033\[([^m]*)m/g, (_, escape) => {
      switch (escape) {
        case '1': return '</span><span class="color-bold">'
        case '31': return '</span><span class="color-red">'
        case '32': return '</span><span class="color-green">'
        case '33': return '</span><span class="color-yellow">'
        case '37': return '</span><span class="color-dim">'
        case '41;31': return '</span><span class="bg-red color-red">'
        case '41;97': return '</span><span class="bg-red color-white">'
        case '43;33': return '</span><span class="bg-yellow color-yellow">'
        case '43;30': return '</span><span class="bg-yellow color-black">'
        case '0': return '</span><span>'
      }
      throw new Error(`Unknown escape sequence: ${escape}`)
    }) + '</span>'

    return result
  }

  // Use a manual loop instead of "replace" due to "await"
  let result = ''
  while (true) {
    const match = /\{\{ FORMAT_MESSAGES\(('[^']*'|\{(?:[^}']|'[^']*')*\}), (\{(?:[^}]|\{[^}]*\})*\})\) \}\}/g.exec(text)
    if (!match) break
    result += text.slice(0, match.index)
    result += await handler(...match)
    text = text.slice(match.index + match[0].length)
  }
  return result + text
}

async function generateMain(key, main) {
  let apiCallsForOption = {}
  let benchmarkCount = 0
  let h3 = null

  const handler = async ({ tag, value }) => {
    let cssID = ''
    if (typeof value === 'string') value = value.replace(/CURRENT_ESBUILD_VERSION/g, CURRENT_ESBUILD_VERSION)

    // Strip off a trailing CSS id
    if (tag.includes('#')) {
      let i = tag.indexOf('#')
      cssID = tag.slice(i + 1)
      tag = tag.slice(0, i)
    }

    if (tag === 'example') {
      let elements = []
      if (value.cli) elements.push(['cli', 'CLI'])
      if (value.js) elements.push(['js', 'JS'])
      if (value.cjs) elements.push(['cjs', 'JS'])
      if (value.mjs) elements.push(['mjs', 'JS'])
      if (value.go) elements.push(['go', 'Go'])
      if (value.unix) elements.push(['unix', 'Unix'])
      if (value.windows) elements.push(['windows', 'Windows'])
      let className = kind => (kind.includes('js') ? 'js' : kind) + elements.length
      if (elements.length === 1) {
        let [kind] = elements[0]
        return `<pre class="${className(kind)}">${renderExample(kind, value[kind])}</pre>`
      }
      let switcherContent = elements.map(([kind, name]) => `<a href="javascript:void 0" class="${className(kind)}">${name}</a>`)
      let exampleContent = elements.map(([kind]) => `<pre class="switchable ${className(kind)}">${renderExample(kind, value[kind])}</pre>`)
      return `<div class="switcher">\n${switcherContent.join('\n')}\n      </div>\n${exampleContent.join('\n')}`
    }

    if (/^h[234]$/.test(tag)) {
      if (tag === 'h3') h3 = toID(value)
      let html = `<${tag} id="${escapeAttribute(toID(cssID || value))}">` +
        `<a class="permalink" href="#${escapeAttribute(toID(cssID || value))}">#</a>` +
        `${md.renderInline(value)}</${tag}>`
      let calls = apiCallsForOption[value]
      if (calls) {
        html += `<p><i>Supported by: ${calls.map(call => {
          return `<a href="#${escapeAttribute(call)}">${call[0].toUpperCase() + call.slice(1)}</a>`
        }).join(' and ')}</i></p>`
      }
      return html
    }

    if (tag === 'toc') {
      let toc = `<ul>\n`
      for (let { tag: t, value: v } of main.body) {
        if (t === 'h2') toc += `<li><a href="#${escapeAttribute(toID(v))}">${md.renderInline(v.trim())}</a></li>\n`
        else if (t.startsWith('h2#')) toc += `<li><a href="#${escapeAttribute(toID(t.slice(3) || v))}">${md.renderInline(v.trim())}</a></li>\n`
      }
      return toc + `</ul>`
    }

    if (tag === 'benchmark' || tag === 'benchmark.animated') {
      if (key === 'index') {
        const svgLight = renderBenchmarkSVG(value, { dark: false });
        const svgDark = renderBenchmarkSVG(value, { dark: true });
        fs.writeFileSync(path.join(repoDir, 'benchmark-light.svg'), svgLight);
        fs.writeFileSync(path.join(repoDir, 'benchmark-dark.svg'), svgDark);
      }

      return renderBenchmark(value, {
        bench: `bench${benchmarkCount++}`,
        animated: tag === 'benchmark.animated',
        leftWidth: key === 'index' ? 90 : 120,
      })
    }

    if (tag === 'pre.raw') {
      return `<pre>${await formatMessagesInText(value.trim())}</pre>`
    }

    if (tag.startsWith('pre.')) {
      return `<pre>${hljs.highlight(tag.slice(4), value.trim()).value}</pre>`
    }

    if (tag === 'pre') {
      return `<pre>${escapeHTML(value.trim())}</pre>`
    }

    if (tag === 'available-options') {
      let sections = {}
      for (let { tag: t, value: v } of main.body)
        if (t === 'h2')
          sections[v] = []
      for (let name of value) {
        let targetH2 = null
        for (let { tag: t, value: v } of main.body) {
          if (t === 'h2') targetH2 = v
          else if (t === 'h3' && v === name) break
        }
        (apiCallsForOption[name] || (apiCallsForOption[name] = [])).push(h3)
        sections[targetH2].push(name)
      }

      const groups = [];
      for (let h2 in sections) {
        if (sections[h2].length === 0) continue
        const group = [];
        group.push(`<b>${escapeHTML(h2)}:</b>`);
        group.push(`<ul>`);
        for (let item of sections[h2]) {
          group.push(`<li><a href="#${escapeAttribute(toID(item))}">${escapeHTML(item)}</a></li>`);
        }
        group.push(`</ul>`);
        group.push(`<br>`);
        groups.push(group);
      }

      // Take some statistics
      let totalLineCount = 0;
      for (const group of groups) totalLineCount += group.length;
      const averageLineCount = totalLineCount / groups.length;
      const lineCountLimit = averageLineCount * Math.ceil(totalLineCount / 50);

      // Attempt to pack things in a bit more
      for (let i = 1; i < groups.length;) {
        if (groups[i - 1].length + groups[i].length < lineCountLimit) {
          groups[i - 1].push(...groups[i]);
          groups.splice(i, 1);
        } else {
          i++;
        }
      }

      let lines = [];
      lines.push(`<div class="available-options">`);
      for (const group of groups) {
        lines.push(`<div class="option-group">`);
        lines.push(...group);
        lines.push(`</div>`);
      }
      lines.push(`</div>`);
      return lines.join('')
    }

    if (tag === 'ul' || tag === 'ol') {
      return `<${tag}>${value.map(x =>
        `<li>${md.renderInline(x.replace(/CURRENT_ESBUILD_VERSION/g, CURRENT_ESBUILD_VERSION).trim())}</li>`
      ).join('')}</${tag}>`
    }

    if (tag === 'table') {
      return `${md.render(value.trim()).replace(/\n/g, '\n      ').trim()}`
    }

    if (tag === 'warning') {
      return `<div class="warning">${md.renderInline(value.trim())}</div>`
    }

    if (tag === 'info') {
      return `<div class="info">${md.renderInline(value.trim())}</div>`
    }

    return `<${tag}>${await formatMessagesInText(md.renderInline(value.trim()))}</${tag}>`
  }

  return (await Promise.all(main.body.map(handler))).join('')
}

function validateLinkInPage(page, hash) {
  for (let { tag, value } of page.body) {
    let cssID = ''

    // Strip off a trailing CSS id
    if (tag.includes('#')) {
      let i = tag.indexOf('#')
      cssID = tag.slice(i + 1)
      tag = tag.slice(0, i)
    }

    if (/^h[234]$/.test(tag)) {
      if (tag === 'h2') h2 = toID(value)
      const id = toID(cssID || value)
      if (id === hash) return true
    }
  }

  return false
}

async function main() {
  // Make sure there aren't any dead links
  let currentPageForLinkValidator
  md.core.ruler.after('inline', 'validate_links', state => {
    if (disableLinkValidator) return
    const [currentKey, currentPage] = currentPageForLinkValidator

    // For each block
    for (const block of state.tokens) {
      if (block.type !== 'inline') continue

      // For each inline
      nextInline: for (const inline of block.children) {
        if (inline.type !== 'link_open') continue
        const href = inline.attrGet('href')

        // Handle special cases
        if (href === '/analyze/') continue

        // Check cross-page links
        if (href.startsWith('/')) {
          const [path, hash = ''] = href.split('#')
          for (const [key, page] of pages) {
            if (path === `/${key}/`) {
              if (hash === '' || validateLinkInPage(page, hash)) continue nextInline
              break
            }
          }
          throw new Error(`Dead link "${href}" on page "${currentKey}"`)
        }

        // Check in-page links
        if (href.startsWith('#')) {
          if (validateLinkInPage(currentPage, href.slice(1))) continue nextInline
          throw new Error(`Dead link "${href}" on page "${currentKey}"`)
        }
      }
    }

    return false
  })

  for (let [key, page] of pages) {
    currentPageForLinkValidator = [key, page]

    let dir = outDir
    if (key !== 'index') {
      dir = path.join(dir, key)
      fs.mkdirSync(dir, { recursive: true })
    }

    let html = []

    // Begin header
    html.push(`<!DOCTYPE html>`)
    html.push(`<html lang="en">`)
    html.push(`<head>`)

    // Header content
    html.push(`<meta charset="utf8">`)
    html.push(`<title>esbuild - ${escapeHTML(page.title)}</title>`)
    html.push(`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`)
    html.push(`<meta property="og:title" content="esbuild - ${escapeAttribute(page.title)}"/>`)
    html.push(`<meta property="og:type" content="website"/>`)
    html.push(`<style>${minifiedCSS}</style>`)
    html.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`)

    // End header
    html.push(`</head>`)

    // Begin body
    html.push(`<body${key === 'index' ? ' class="index"' : ''}>`)
    html.push(`<script>${minifiedJS}</script>`)

    // Menu bar
    html.push(`<div id="menubar">`)
    html.push(`<a id="menutoggle" href="javascript:void 0" aria-label="Toggle the menu">`)
    html.push(`<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">`)
    html.push(`<rect x="15" y="18" width="20" height="2" stroke-width="0"></rect>`)
    html.push(`<rect x="15" y="24" width="20" height="2" stroke-width="0"></rect>`)
    html.push(`<rect x="15" y="30" width="20" height="2" stroke-width="0"></rect>`)
    html.push(`</svg>`)
    html.push(`</a>`)
    html.push(`</div>`)

    // Begin menu
    html.push(`<nav>`)
    html.push(`<div id="shadow"></div>`)
    html.push(`<div id="menu">`)
    html.push(`<a href="/" class="logo">esbuild</a>`)
    html.push(`<ul>`)
    html.push(generateNav(key))
    html.push(`</ul>`)
    html.push(`<div id="icons">`)

    // View on github
    html.push(`<a href="https://github.com/evanw/esbuild" aria-label="View this project on GitHub">`)
    html.push(`<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25">`)
    html.push(`<path fill-rule="evenodd" stroke-width="0" d="M13 5a8 8 0 00-2.53 15.59c.4.07.55-.17.55`)
    html.push(`-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52`)
    html.push(`-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78`)
    html.push(`-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2`)
    html.push(`.82a7.42 7.42 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27`)
    html.push(`.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A`)
    html.push(`8.01 8.01 0 0021 13a8 8 0 00-8-8z"></path>`)
    html.push(`</svg>`)
    html.push(`</a>`)

    // Toggle dark mode
    html.push(`<a href="javascript:void 0" id="theme" aria-label="Toggle dark mode">`)
    html.push(`<svg id="theme-light" width="25" height="25" xmlns="http://www.w3.org/2000/svg">`)
    html.push(`<path d="M13.5 4v3m9.5 6.5h-3M13.5 23v-3M7 13.5H4M9 9L7 7m13 0l-2 2m2 11l-2-2M7 20l2-2"></path>`)
    html.push(`<circle cx="13.5" cy="13.5" r="4.5" stroke-width="0"></circle>`)
    html.push(`</svg>`)
    html.push(`<svg id="theme-dark" width="25" height="25" xmlns="http://www.w3.org/2000/svg">`)
    html.push(`<path d="M10.1 6.6a8.08 8.08 0 00.24 11.06 8.08 8.08 0 0011.06.24c-6.46.9-12.2-4.84-11.3-11.3z" stroke-width="0"></path>`)
    html.push(`</svg>`)
    html.push(`</a>`)

    // End menu
    html.push(`</div>`)
    html.push(`</div>`)
    html.push(`</nav>`)

    // Main content
    html.push(`<main>`)
    html.push(await generateMain(key, page))
    html.push(`</main>`)

    // End body
    html.push(`</body>`)
    html.push(`</html>`)
    html.push(`\n`)

    fs.writeFileSync(path.join(dir, 'index.html'), html.join(''))
  }
}

main()
