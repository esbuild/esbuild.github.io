import * as styles from './warnings.css'
import { Metafile } from './metafile'
import { showWhyFile } from './whyfile'
import {
  commonPostfixFinder,
  commonPrefixFinder,
  splitPathBySlash,
  textToHTML,
} from './helpers'

let previousMetafile: Metafile | undefined

let generateWarnings = (metafile: Metafile): HTMLElement[] => {
  let inputs = metafile.inputs
  let resolvedPaths: Record<string, string[]> = {}
  let warnings: HTMLElement[] = []

  for (let i in inputs) {
    let input = inputs[i]
    for (let record of input.imports) {
      if (record.original && record.original[0] !== '.') {
        let array = resolvedPaths[record.original] || (resolvedPaths[record.original] = [])
        if (!array.includes(record.path)) array.push(record.path)
      }
    }
  }

  for (let original in resolvedPaths) {
    let array = resolvedPaths[original]

    if (array.length > 1) {
      let warningEl = document.createElement('div')
      let listEl = document.createElement('ul')
      let commonPrefix: string[] | undefined
      let commonPostfix: string[] | undefined

      warningEl.className = styles.warning
      warningEl.innerHTML = 'The import path <code>' + textToHTML(original) + '</code> resolves to multiple files in the bundle:'

      for (let path of array) {
        commonPrefix = commonPrefixFinder(path, commonPrefix)
      }

      for (let path of array) {
        let parts = splitPathBySlash(path)
        if (commonPrefix) parts = parts.slice(commonPrefix.length)
        commonPostfix = commonPostfixFinder(parts.join('/'), commonPostfix)
      }

      for (let path of array.sort()) {
        let parts = splitPathBySlash(path).map(textToHTML)
        let itemEl = document.createElement('li')
        let html = '<pre><a href="javascript:void 0">'
        let postfix = ''

        if (commonPrefix && commonPrefix.length) {
          html += ''
            + `<span class="${styles.dim}">`
            + parts.slice(0, commonPrefix.length).join('/')
            + '/'
            + '</span>'
          parts = parts.slice(commonPrefix.length)
        }

        if (commonPostfix && commonPostfix.length) {
          postfix = ''
            + `<span class="${styles.dim}">`
            + (parts.length > commonPostfix.length ? '/' : '')
            + parts.slice(parts.length - commonPostfix.length).join('/')
            + '</span>'
          parts.length -= commonPostfix.length
        }

        itemEl.innerHTML = html + '<b>' + parts.join('/') + '</b>' + postfix + '</a></pre>'
        listEl.append(itemEl)

        itemEl.querySelector('a')!.onclick = () => {
          showWhyFile(metafile, path, null)
        }
      }

      warningEl.append(listEl)
      warnings.push(warningEl)
    }
  }

  return warnings
}

export let showWarningsPanel = (metafile: Metafile): void => {
  if (previousMetafile === metafile) return
  previousMetafile = metafile

  let warningsPanel = document.getElementById('warningsPanel') as HTMLDivElement
  let warnings = generateWarnings(metafile)
  let n = warnings.length

  if (n) {
    warningsPanel.innerHTML = ''
      + `<div class="${styles.expand}">`
      + '⚠️ This bundle has <b><a href="javascript:void 0">' + n + ' warning' + (n === 1 ? '' : 's') + '</a></b><span>.</span>'
      + '</div>'

    let spanEl = warningsPanel.querySelector('span') as HTMLSpanElement
    let contentEl = document.createElement('div')
    contentEl.className = styles.content
    for (let warning of warnings) contentEl.append(warning)
    warningsPanel.append(contentEl)

    warningsPanel.querySelector('a')!.onclick = () => {
      if (contentEl.style.display === 'block') {
        spanEl.textContent = '.'
        contentEl.style.display = 'none'
      } else {
        spanEl.textContent = ':'
        contentEl.style.display = 'block'
      }
    }
  } else {
    warningsPanel.innerHTML = ''
  }
}
