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

function copyAndMinify(from, to) {
  esbuild.buildSync({ entryPoints: [from], outfile: to, minify: true })
}

fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(scriptsDir, 'index.png'), path.join(outDir, 'index.png'))

copyAndMinify(path.join(scriptsDir, 'style.css'), path.join(outDir, 'style.css'))
copyAndMinify(path.join(scriptsDir, 'script.js'), path.join(outDir, 'script.js'))

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

function toID(text) {
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
        if (tag === 'h2') {
          h3s = []
          h2 = { value, h3s }
          h2s.push(h2)
        } else if (tag === 'h3' && k === key) {
          h3s.push({ value })
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

      for (let { value, h3s } of h2s) {
        let a = `<a href="${target}#${escapeAttribute(toID(value))}">${escapeHTML(value)}</a>`

        if (h3s.length > 0) {
          nav.push(`              <li${k === key ? ` id="nav-${escapeAttribute(toID(value))}"` : ''}>`)
          nav.push(`                ${a}`)
          nav.push(`                <ul class="h3">`)

          for (let { value } of h3s) {
            let a = `<a href="#${escapeAttribute(toID(value))}">${escapeHTML(value)}</a>`
            nav.push(`                  <li id="nav-${escapeAttribute(toID(value))}">${a}</li>`)
          }

          nav.push(`                </ul>`)
          nav.push(`              </li>`)
        }

        else {
          nav.push(`              <li${k === key ? ` id="nav-${escapeAttribute(toID(value))}"` : ''}>${a}</li>`)
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
      tags.push(`        .${bench}-label${i} { animation: label-bold ${time}s linear; font-weight: bold }`)
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
    let labelID = `${bench}-label${i}`
    let y = i * barHeight
    let w = (100 * time * horizontalScale / rightWidth).toFixed(2) + '%'
    let h = barHeight
    let barY = y + barMargin
    let barH = h - 2 * barMargin
    tags.push(`          <div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:rgba(127,127,127,0.2);"></div>`)
    tags.push(`          <div style="position:absolute;left:0;top:${barY}px;width:${w};height:${barH}px;background:rgba(231,173,0,0.9);" class="${barID}"></div>`)
    tags.push(`          <div style="position:absolute;right:100%;top:${y}px;width:${leftWidth}px;height:${h}px;` +
      `text-align:right;white-space:nowrap;margin-right:${labelMargin}px;" class="${labelID}">${md.renderInline(name.trim())}</div>`)
    tags.push(`          <div style="position:absolute;left:${w};top:${y}px;height:${h}px;` +
      `margin-left:${labelMargin}px;" class="${labelID}">${escapeHTML(time.toFixed(2))}s</div>`)
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
  if (value instanceof Array) {
    let lines = []
    for (let item of value) {
      if (item.$) {
        let html = hljs.highlight(kind === 'cli' ? 'bash' : kind, item.$.trim()).value
        lines.push(`<span class="repl-in">${html}</span>`)
      } else if (item.expect) {
        lines.push(`<span class="repl-out">${escapeHTML(item.expect.trim())}</span>`)
      } else {
        throw new Error('Internal error')
      }
    }
    return lines.join('')
  }
  return hljs.highlight(kind === 'cli' ? 'bash' : kind, value.trim()).value
}

function generateMain(key, main) {
  let apiCallsForOption = {}
  let benchmarkCount = 0
  let h2 = null

  return main.body.map(({ tag, value }) => {
    if (tag === 'example') {
      let elements = []
      if (value.cli) elements.push(['cli', 'CLI'])
      if (value.js) elements.push(['js', 'JS'])
      if (value.go) elements.push(['go', 'Go'])
      if (elements.length === 1) {
        let [kind] = elements[0]
        return `      <pre>${renderExample(kind, value[kind])}</pre>`
      }
      let switcherContent = elements.map(([kind, name]) => `        <a href="javascript:void 0" class="${kind + elements.length}">${name}</a>`)
      let exampleContent = elements.map(([kind]) => `      <pre class="switchable ${kind + elements.length}">${renderExample(kind, value[kind])}</pre>`)
      return `      <div class="switcher">\n${switcherContent.join('\n')}\n      </div>\n${exampleContent.join('\n')}`
    }

    if (/^h[23]$/.test(tag)) {
      if (tag === 'h2') h2 = toID(value)
      let html = `      <${tag} id="${escapeAttribute(toID(value))}"${tag === 'h3' && h2 ? ` data-h2="${escapeAttribute(h2)}"` : ''}>
        <a href="#${escapeAttribute(toID(value))}">#</a>
        ${escapeHTML(value)}
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

    if (tag === 'ul') {
      return `      <ul>${value.map(x => `<li>${md.renderInline(x.trim())}</li>`).join('')}</ul>`
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
    <script>
      try {
        document.body.dataset.mode3 = localStorage.getItem('mode3') || 'cli'
        document.body.dataset.mode2 = localStorage.getItem('mode2') || 'js'
        document.body.dataset.theme = localStorage.getItem('theme')
      } catch (e) {
        document.body.dataset.mode3 = 'cli'
        document.body.dataset.mode2 = 'js'
        document.body.dataset.theme = null
      }
      document.body.classList.add('has-js')
    </script>
    <script src="/script.js" defer></script>
    <div id="menubar">
      <a id="menutoggle" href="javascript:void 0" aria-label="Toggle the menu">
        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="18" width="20" height="2" stroke-width="0"/>
          <rect x="15" y="24" width="20" height="2" stroke-width="0"/>
          <rect x="15" y="30" width="20" height="2" stroke-width="0"/>
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
                8.01 8.01 0 0021 13a8 8 0 00-8-8z"/>
            </svg>
          </a><a href="javascript:void 0" id="theme" aria-label="Toggle dark mode">
            <svg id="theme-light" width="25" height="25" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 4v3m9.5 6.5h-3M13.5 23v-3M7 13.5H4M9 9L7 7m13 0l-2 2m2 11l-2-2M7 20l2-2"/>
              <circle cx="13.5" cy="13.5" r="4.5" stroke-width="0"/>
            </svg>
            <svg id="theme-dark" width="25" height="25" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.1 6.6a8.08 8.08 0 00.24 11.06 8.08 8.08 0 0011.06.24c-6.46.9-12.2-4.84-11.3-11.3z" stroke-width="0"/>
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
