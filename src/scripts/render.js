const yaml = require('js-yaml')
const path = require('path')
const md = require('markdown-it')({ html: true })
const hljs = require('highlight.js')
const esbuild = require('esbuild')
const fs = require('fs')
const repoDir = path.dirname(path.dirname(__dirname))
const scriptsDir = path.join(repoDir, 'src', 'scripts')
const contentDir = path.join(repoDir, 'src', 'content')
const outDir = path.join(repoDir, 'out')
const linkDir = path.join(scriptsDir, 'link')
const linkOutDir = path.join(outDir, 'link')

// Replace "CURRENT_ESBUILD_VERSION" with the currently-installed version
// of esbuild. This should be reasonably up to date.
const CURRENT_ESBUILD_VERSION = require('../../package.json').dependencies.esbuild;

function buildAndMinify(file) {
  return esbuild.buildSync({
    entryPoints: [file],
    minify: true,
    target: ['chrome1', 'safari1', 'firefox1', 'edge1'],
    write: false,
  }).outputFiles[0].text
}

function copyAndMinify(from, to) {
  esbuild.buildSync({
    entryPoints: [from],
    outfile: to,
    minify: true,
    target: ['chrome1', 'safari1', 'firefox1', 'edge1'],
  })
}

fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(scriptsDir, 'index.png'), path.join(outDir, 'index.png'))
fs.copyFileSync(path.join(scriptsDir, 'favicon.svg'), path.join(outDir, 'favicon.svg'))

copyAndMinify(path.join(scriptsDir, 'style.css'), path.join(outDir, 'style.css'))
const minifiedJS = buildAndMinify(path.join(scriptsDir, 'script.js'))

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

function stripTagsFromMarkdown(markdown) {
  return md.renderInline(markdown.trim()).replace(/<[^>]*>/g, '')
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

    if (k !== 'faq' || k === key) {
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
  }

  let nav = []

  for (let { k, title, h2s } of structure) {
    let target = k === key ? '' : `/${escapeAttribute(k)}/`

    if (h2s.length > 0) {
      nav.push(`          <li>`)
      nav.push(`            <a href="/${escapeAttribute(k)}/">${escapeHTML(title)}</a>`)
      nav.push(`            <ul class="h2">`)

      for (let { cssID, value, h3s } of h2s) {
        let a = `<a href="${target}#${escapeAttribute(cssID)}">${escapeHTML(value)}</a>`

        if (h3s.length > 0) {
          nav.push(`              <li${k === key ? ` id="nav-${escapeAttribute(cssID)}"` : ''}>`)
          nav.push(`                ${a}`)
          nav.push(`                <ul class="h3">`)

          for (let { cssID, value } of h3s) {
            let a = `<a href="#${escapeAttribute(cssID)}">${escapeHTML(value)}</a>`
            nav.push(`                  <li id="nav-${escapeAttribute(cssID)}">${a}</li>`)
          }

          nav.push(`                </ul>`)
          nav.push(`              </li>`)
        }

        else {
          nav.push(`              <li${k === key ? ` id="nav-${escapeAttribute(cssID)}"` : ''}>${a}</li>`)
        }
      }

      nav.push(`            </ul>`)
      nav.push(`          </li>`)
    }

    else {
      nav.push(`          <li><a href="/${escapeAttribute(k)}/">${escapeHTML(title)}</a></li>`)
    }
  }

  return nav.join('\n')
}

function renderBenchmarkSVG(entries) {
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
  let svg = []

  // Begin chart
  svg.push(`<svg width="${width}" height="${height}" fill="black" font-family="sans-serif" font-size="13px" xmlns="http://www.w3.org/2000/svg">`)

  // Github colors in dark mode for the readme
  svg.push(`  <style>`)
  svg.push(`    @media (prefers-color-scheme: dark) {`)
  svg.push(`      #bg { fill: #0D1116; }`)
  svg.push(`      text { fill: #C9D1D9; }`)
  svg.push(`    }`)
  svg.push(`  </style>`)
  svg.push(`  <rect id="bg" width="${width}" height="${height}" fill="#FFFFFF"/>`)

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
    svg.push(`  <text x="${leftWidth - labelMargin}" y="${y + h / 2}" text-anchor="end" dominant-baseline="middle"${bold}>${label}</text>`)
    svg.push(`  <text x="${leftWidth + labelMargin + w}" y="${y + h / 2}" dominant-baseline="middle"${bold}>${escapeHTML(time.toFixed(2))}s</text>`)
  }

  // Horizontal labels
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = leftWidth + i * horizontalScale
    let y = topMargin + topHeight + labelMargin / 2
    svg.push(`  <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="hanging">${escapeHTML(i + 's')}</text>`)
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
    tags.push(`      <style>`)
    tags.push(`        @keyframes ${bench}-anim { 0% { left: 0 } 100% { left: ${100 * max * horizontalScale / rightWidth}% } }`)
    tags.push(`        #${bench}-progress { animation: ${bench}-anim ${max}s linear; left: ${100 * max * horizontalScale / rightWidth}% }`)
    for (let i = 0; i < times.length; i++) {
      let [_, time] = times[i]
      tags.push(`        .${bench}-bar${i} { animation: scale-bar ${time}s linear; transform-origin: left }`)
    }
    tags.push(`      </style>`)
  }

  // Begin chart
  tags.push(`      <figure class="bench" style="position:relative;max-width:${width}px;height:${height}px;font-size:13px;line-height:${barHeight}px;">`)
  tags.push(`        <div style="position:absolute;left:${leftWidth}px;top:0;right:0;height:${height - bottomHeight}px;">`)

  // Horizontal axis bars
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = (100 * i * horizontalScale / rightWidth).toFixed(2) + '%'
    tags.push(`          <div style="position:absolute;left:${x};top:0;width:1px;bottom:0;background:rgba(127,127,127,0.25);"></div>`)
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
    tags.push(`          <div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:rgba(191,191,191,0.2);"></div>`)
    tags.push(`          <div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:#FFCF00;" class="${barID}"></div>`)
    tags.push(`          <div style="position:absolute;right:100%;top:${y}px;width:${leftWidth}px;height:${h}px;` +
      `text-align:right;white-space:nowrap;margin-right:${labelMargin}px;${bold}">${md.renderInline(name.trim())}</div>`)
    tags.push(`          <div style="position:absolute;left:${w};top:${y}px;height:${h}px;` +
      `margin-left:${labelMargin}px;${bold}">${escapeHTML(time.toFixed(2))}s</div>`)
  }

  // Horizontal labels
  for (let i = 0; i * horizontalScale < rightWidth; i += horizontalStep) {
    let x = (100 * i * horizontalScale / rightWidth).toFixed(2) + '%'
    let y = topHeight + labelMargin / 2
    tags.push(`          <div style="position:absolute;left:${x};top:${y}px;width:50px;margin-left:-25px;text-align:center;">${escapeHTML(i + 's')}</div>`)
  }

  // End chart
  if (animated) {
    let y = topHeight + labelMargin / 2
    tags.push(`          <div id="${bench}-progress" class="progress" style="position:absolute;top:${y}px;width:50px;margin-left:-25px;text-align:center;"></div>`)
  }
  tags.push(`        </div>`)

  // Animate the time
  if (animated) {
    tags.push(`      <script>`)
    tags.push(`        (function() {`)
    tags.push(`          var anim, el = document.getElementById('${bench}-progress')`)
    tags.push(`          if (!el.getAnimations) return`)
    tags.push(`          function update() {`)
    tags.push(`            anim = anim || el.getAnimations()[0]`)
    tags.push(`            if (!anim) return`)
    tags.push(`            el.textContent = Math.floor(anim.timeline.currentTime / 1000) + 's'`)
    tags.push(`            if (anim.playState === 'finished') clearInterval(i), el.style.display = 'none'`)
    tags.push(`          }`)
    tags.push(`          var i = setInterval(update, 250)`)
    tags.push(`          update()`)
    tags.push(`        })()`)
    tags.push(`      </script>`)
  }

  tags.push(`      </figure>`)
  return tags.join('\n')
}

function renderExample(kind, value) {
  let hljsLang = kind === 'cli' || kind === 'unix' || kind === 'windows' ? 'bash' : kind;
  if (value instanceof Array) {
    let lines = []
    for (let item of value) {
      if (item.$) {
        let html = hljs.highlight(hljsLang, item.$.trim()).value
        html = html.replace(/CURRENT_ESBUILD_VERSION/g, CURRENT_ESBUILD_VERSION)
        lines.push(`<span class="repl-in">${html}</span>`)
      } else if (item.expect) {
        lines.push(`<span class="repl-out">${escapeHTML(item.expect.trim())}</span>`)
      } else {
        throw new Error('Internal error')
      }
    }
    return lines.join('')
  }
  return hljs.highlight(hljsLang, value.trim()).value
}

function generateMain(key, main) {
  let apiCallsForOption = {}
  let benchmarkCount = 0
  let h2 = null
  let h3 = null

  return main.body.map(({ tag, value }) => {
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
      if (value.go) elements.push(['go', 'Go'])
      if (value.unix) elements.push(['unix', 'Unix'])
      if (value.windows) elements.push(['windows', 'Windows'])
      if (elements.length === 1) {
        let [kind] = elements[0]
        return `      <pre class="${kind + elements.length}">${renderExample(kind, value[kind])}</pre>`
      }
      let switcherContent = elements.map(([kind, name]) => `        <a href="javascript:void 0" class="${kind + elements.length}">${name}</a>`)
      let exampleContent = elements.map(([kind]) => `      <pre class="switchable ${kind + elements.length}">${renderExample(kind, value[kind])}</pre>`)
      return `      <div class="switcher">\n${switcherContent.join('\n')}\n      </div>\n${exampleContent.join('\n')}`
    }

    if (/^h[234]$/.test(tag)) {
      if (tag === 'h2') h2 = toID(value)
      if (tag === 'h3') h3 = toID(value)
      let dataset = ''
      if (tag !== 'h2' && h2) dataset += ` data-h2="${escapeAttribute(h2)}"`
      if (tag === 'h4' && h3) dataset += ` data-h3="${escapeAttribute(h3)}"`
      let html = `      <${tag} id="${escapeAttribute(toID(cssID || value))}"${dataset}>
        <a class="permalink" href="#${escapeAttribute(toID(cssID || value))}">#</a>
        ${md.renderInline(value)}
      </${tag}>`
      let calls = apiCallsForOption[value]
      if (calls) {
        html += `\n      <p><i>Supported by: ${calls.map(call => {
          return `<a href="#${escapeAttribute(call)}">${call[0].toUpperCase() + call.slice(1).replace('-api', '')}</a>`
        }).join(' | ')}</i></p>`
      }
      return html
    }

    if (tag === 'toc') {
      let toc = `      <ul>\n`
      for (let { tag: t, value: v } of main.body) {
        if (t === 'h2') toc += `        <li><a href="#${escapeAttribute(toID(v))}">${md.renderInline(v.trim())}</a></li>\n`
      }
      return toc + `      </ul>`
    }

    if (tag === 'benchmark' || tag === 'benchmark.animated') {
      if (key === 'index') {
        const svg = renderBenchmarkSVG(value);
        fs.writeFileSync(path.join(repoDir, 'benchmark.svg'), svg);
      }

      return renderBenchmark(value, {
        bench: `bench${benchmarkCount++}`,
        animated: tag === 'benchmark.animated',
        leftWidth: key === 'index' ? 90 : 120,
      })
    }

    if (tag === 'pre.raw') {
      return `      <pre>${value.trim()}</pre>`
    }

    if (tag.startsWith('pre.')) {
      return `      <pre>${hljs.highlight(tag.slice(4), value.trim()).value}</pre>`
    }

    if (tag === 'pre') {
      return `      <pre>${escapeHTML(value.trim())}</pre>`
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
        (apiCallsForOption[name] || (apiCallsForOption[name] = [])).push(h2)
        sections[targetH2].push(name)
      }
      let lines = []
      for (let h2 in sections) {
        if (sections[h2].length === 0) continue
        lines.push(`      <p>${escapeHTML(h2)}:</p>`);
        lines.push(`      <ul>`);
        for (let item of sections[h2]) {
          lines.push(`        <li><a href="#${escapeAttribute(toID(item))}">${escapeHTML(item)}</a></li>`);
        }
        lines.push(`      </ul>`);
      }
      return lines.join('\n')
    }

    if (tag === 'ul' || tag === 'ol') {
      return `      <${tag}>${value.map(x =>
        `<li>${md.renderInline(x.replace(/CURRENT_ESBUILD_VERSION/g, CURRENT_ESBUILD_VERSION).trim())}</li>`
      ).join('')}</${tag}>`
    }

    if (tag === 'table') {
      return `      ${md.render(value.trim()).replace(/\n/g, '\n      ').trim()}`
    }

    if (tag === 'warning') {
      return `      <div class="warning">${md.renderInline(value.trim())}</div>`
    }

    return `      <${tag}>${md.renderInline(value.trim())}</${tag}>`
  }).join('\n')
}

for (let [key, page] of pages) {
  let dir = outDir
  if (key !== 'index') {
    dir = path.join(dir, key)
    fs.mkdirSync(dir, { recursive: true })
  }

  let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <title>esbuild - ${escapeHTML(page.title)}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <meta property="og:title" content="esbuild - ${escapeAttribute(page.title)}"/>
    <meta property="og:type" content="website"/>
    <meta property="og:image" content="https://esbuild.github.io/index.png"/>
    <meta property="twitter:card" content="summary_large_image"/>
    <meta property="twitter:title" content="esbuild - ${escapeAttribute(page.title)}"/>
    <meta property="twitter:image" content="https://esbuild.github.io/index.png"/>
    <link rel="stylesheet" href="/style.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body${key === 'index' ? ' class="index"' : ''}>
    <script>${minifiedJS}</script>
    <div id="menubar">
      <a id="menutoggle" href="javascript:void 0" aria-label="Toggle the menu">
        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="18" width="20" height="2" stroke-width="0"></rect>
          <rect x="15" y="24" width="20" height="2" stroke-width="0"></rect>
          <rect x="15" y="30" width="20" height="2" stroke-width="0"></rect>
        </svg>
      </a>
    </div>
    <nav>
      <div id="shadow"></div>
      <div id="menu">
        <a href="/" class="logo">esbuild</a>
        <ul>
${generateNav(key)}
        </ul>
        <div id="icons">
          <a href="https://github.com/evanw/esbuild" aria-label="View this project on GitHub">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25">
              <path fill-rule="evenodd" stroke-width="0" d="M13 5a8 8 0 00-2.53 15.59c.4.07.55-.17.55
                -.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
                -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78
                -.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2
                .82a7.42 7.42 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27
                .82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A
                8.01 8.01 0 0021 13a8 8 0 00-8-8z"></path>
            </svg>
          </a><a href="javascript:void 0" id="theme" aria-label="Toggle dark mode">
            <svg id="theme-light" width="25" height="25" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 4v3m9.5 6.5h-3M13.5 23v-3M7 13.5H4M9 9L7 7m13 0l-2 2m2 11l-2-2M7 20l2-2"></path>
              <circle cx="13.5" cy="13.5" r="4.5" stroke-width="0"></circle>
            </svg>
            <svg id="theme-dark" width="25" height="25" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.1 6.6a8.08 8.08 0 00.24 11.06 8.08 8.08 0 0011.06.24c-6.46.9-12.2-4.84-11.3-11.3z" stroke-width="0"></path>
            </svg>
          </a>
        </div>
      </div>
    </nav>

    <main>
${generateMain(key, page)}
    </main>
  </body>
</html>
`
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}
