// This callback generates the link at the time of the click. In some cases
// this is just a performance benefit and in other cases this is actually
// important for correctness (e.g. searching for a matching file with the
// correct name at the time of the click).
export function generateSourceMapLink(callback: () => [code: string, map: string]): HTMLAnchorElement {
  const a = document.createElement('a')
  a.className = 'underLink'
  a.href = 'javascript:void 0'
  a.target = '_blank'
  a.textContent = 'Visualize this source map'
  a.onclick = () => {
    const [code, map] = callback()
    const hash = `${code.length}\0${code}${map.length}\0${map}`
    a.href = 'https://evanw.github.io/source-map-visualization/#' + btoa(hash)
    setTimeout(() => a.href = 'javascript:void 0')
  }
  return a
}

function extractInlineSourceMappingURL(code: string): string | null {
  // Check for both "//" and "/*" comments
  let match = /\/(\/)[#@] *sourceMappingURL=([^\s]+)/.exec(code)
  if (!match) match = /\/(\*)[#@] *sourceMappingURL=((?:[^\s*]|\*[^/])+)(?:[^*]|\*[^/])*\*\//.exec(code)

  // Check for a non-empty data URL payload
  return match && match[2]
}

export function toggleInlineSourceMapLink(parentEl: HTMLElement, code: string, sourceMapEl: HTMLAnchorElement | undefined): HTMLAnchorElement | undefined {
  const map = extractInlineSourceMappingURL(code)
  if (sourceMapEl) {
    sourceMapEl.remove()
  }
  if (map && map.startsWith('data:application/json;base64,')) {
    let json: any
    try {
      json = JSON.parse(atob(map.slice(29)))
    } catch {
    }
    if (json && typeof json === 'object') {
      sourceMapEl = generateSourceMapLink(() => [code, JSON.stringify(json)])
      parentEl.append(sourceMapEl)
    }
  }
  return sourceMapEl
}
