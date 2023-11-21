import * as styles from './whyfile.css'
import { Metafile } from './metafile';
import {
  bytesToText,
  createCode,
  createSpanWithClass,
  createText,
  hasOwnProperty,
  lastInteractionWasKeyboard,
  nodeModulesPackagePathOrNull,
  posixDirname,
  posixRelPath,
  textToHTML,
} from './helpers';

interface ImportRecord {
  inputPath_: string
  originalPath_: string | undefined
  kind_: string
  with_: Record<string, string> | undefined
}

interface Info {
  // Maps the original input file to the final output file
  entryPoints_: Record<string, string>

  // Maps the imported file to an importer on the path to an entry point
  importers_: Record<string, ImportRecord>
}

let whyFileEl = document.createElement('div')
let cachedMetafile: Metafile | undefined
let cachedInfo: Info | undefined
let elementToFocusAfterHide: HTMLElement | null = null
let isIdentifier = /^\w[\w\d]*$/

export let isWhyFileVisible = () => whyFileEl.parentElement !== null
export let hideWhyFile = () => {
  whyFileEl.remove()
  if (elementToFocusAfterHide) {
    elementToFocusAfterHide.focus()
    elementToFocusAfterHide = null
  }
}

// This calculates a map from each module to the module that
// imports it on the closest path toward an entry point module
export let computeImporters = (metafile: Metafile): Info => {
  let inputs = metafile.inputs
  let outputs = metafile.outputs
  let entryPoints: Record<string, string> = {}
  let importers: Record<string, ImportRecord> = {}
  let allEntryPointOutputs: string[] = []
  let crossChunkImports: Record<string, boolean> = {}

  for (let o in outputs) {
    let output = outputs[o]
    let entryPoint = output.entryPoint
    if (entryPoint) {
      entryPoints[entryPoint] = o
      allEntryPointOutputs.push(o)
      for (let record of output.imports) {
        if (!record.external && !hasOwnProperty.call(crossChunkImports, record.path)) {
          crossChunkImports[record.path] = true
        }
      }
    }
  }

  let current: string[] = []

  // First try to find the entry points that aren't imported into other chunks.
  // This happens for dynamic "import()" expressions (they are considered entry
  // points, but are still imported into other chunks).
  for (let o of allEntryPointOutputs) {
    let entryPoint = outputs[o].entryPoint!
    if (!hasOwnProperty.call(crossChunkImports, o)) {
      importers[entryPoint] = { inputPath_: entryPoint, originalPath_: undefined, kind_: 'entry-point', with_: undefined }
      current.push(entryPoint)
    }
  }

  // If that didn't work (perhaps all entry points import each other?),
  // then fall back to treating all of the entry points as the roots.
  if (!current.length) {
    for (let o of allEntryPointOutputs) {
      let entryPoint = outputs[o].entryPoint!
      importers[entryPoint] = { inputPath_: entryPoint, originalPath_: undefined, kind_: 'entry-point', with_: undefined }
      current.push(entryPoint)
    }
  }

  // Do a depth-first search through the graph until no more nodes are visited.
  // This way the resulting map stores the shortest path to an entry point.
  while (current.length > 0) {
    let next: string[] = []

    for (let path of current) {
      let input = inputs[path]

      for (let record of input.imports) {
        if (!record.external && !hasOwnProperty.call(importers, record.path)) {
          importers[record.path] = {
            inputPath_: path,
            originalPath_: record.original,
            kind_: record.kind,
            with_: record.with,
          }
          next.push(record.path)
        }
      }
    }

    current = next
  }

  return {
    entryPoints_: entryPoints,
    importers_: importers,
  }
}

export let showWhyFile = (metafile: Metafile, path: string, bytesInOutput: number | null): void => {
  let input = metafile.inputs[path]
  let activeEl = document.activeElement
  if (!input) return

  if (!cachedInfo || cachedMetafile !== metafile) {
    cachedMetafile = metafile
    cachedInfo = computeImporters(metafile)
  }

  // If this is a keyboard navigation from a link, then re-focus the link we came from when we are hidden
  if (lastInteractionWasKeyboard && activeEl && (activeEl as HTMLElement).focus && activeEl.tagName === 'A') {
    elementToFocusAfterHide = activeEl as HTMLElement
  }

  let dialogEl = document.createElement('div')
  dialogEl.className = styles.dialog
  dialogEl.innerHTML = ''
    + '<h2>' + textToHTML(path) + '</h2>'
    + '<p>'
    + 'Original size: <b>' + textToHTML(bytesToText(input.bytes)) + '</b>'
    + (bytesInOutput === null ? '' : '<br>Bundled size: <b>' + textToHTML(bytesToText(bytesInOutput)) + '</b>')
    + (input.format === 'esm' ? '<br>Module format: <b>ESM</b>' : input.format === 'cjs' ? '<br>Module format: <b>CommonJS</b>' : '')
    + (input.with ? '<br>Import attributes: <b>' + textToHTML(Object.entries(input.with).map(([k, v]) => {
      return (isIdentifier.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(v)
    }).join(', ')) + '</b>' : '')
    + '</p>'

  tryToExplainWhyFileIsInBundle(dialogEl, cachedInfo, path)

  let closeButtonEl = document.createElement('a')
  closeButtonEl.className = styles.closeButton
  closeButtonEl.href = 'javascript:void 0'
  closeButtonEl.onclick = hideWhyFile
  closeButtonEl.innerHTML = '&times;'
  dialogEl.append(closeButtonEl)
  dialogEl.tabIndex = 0

  whyFileEl.id = styles.whyFile
  whyFileEl.innerHTML = ''
  whyFileEl.append(dialogEl)

  // Note: Don't use an implicit return here because returning false disables selection
  whyFileEl.onmousedown = e => {
    if (e.target === whyFileEl) hideWhyFile()
  }

  document.body.append(whyFileEl)

  // Capture the escape key to close the dialog
  dialogEl.focus()
  dialogEl.onkeydown = e => {
    if (e.key === 'Escape' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      hideWhyFile()
    }
  }
}

let tryToExplainWhyFileIsInBundle = (el: HTMLElement, info: Info, path: string): void => {
  interface Item {
    inputPath_: string
    import_: ImportRecord | null
  }

  // Trace from this file back to the root entry point
  let importers = info.importers_
  let current = path
  let items: Item[] = [{
    inputPath_: path,
    import_: null,
  }]
  while (true) {
    let importer = importers[current]
    if (!importer) {
      // This can happen to files that are implicitly included such as with the "inject" feature
      return
    }
    if (current === importer.inputPath_) {
      // Stop when we reach the root entry point
      break
    }
    items.push({
      inputPath_: importer.inputPath_,
      import_: {
        inputPath_: current,
        originalPath_: importer.originalPath_,
        kind_: importer.kind_,
        with_: importer.with_,
      },
    })
    current = importer.inputPath_
  }
  items.reverse()

  // Pretty-print the trace
  let entryPoints = info.entryPoints_
  let outputFileEl: HTMLDivElement | undefined
  let label = 'Entry point'
  el.append('This file is included in the bundle because:')
  for (let item of items) {
    if (hasOwnProperty.call(entryPoints, item.inputPath_)) {
      let outputPathEl = document.createElement('div')
      outputFileEl = document.createElement('div')
      outputFileEl.className = styles.outputFile
      outputPathEl.className = styles.outputPath
      outputPathEl.textContent = 'Output file '
      outputPathEl.append(createCode(entryPoints[item.inputPath_]))
      outputFileEl.append(outputPathEl)
      el.appendChild(outputFileEl)
    }

    else if (!outputFileEl) {
      // This shouldn't happen
      return
    }

    let labelEl = createText(label + ' ')
    let targetEl = createText(' is included in the bundle.\n')
    if (outputFileEl.firstChild) outputFileEl.append('\n')
    outputFileEl.append(
      labelEl,
      createCode(item.inputPath_),
      targetEl,
    )

    let record = item.import_
    if (record) {
      let originalPath = record.originalPath_ || nodeModulesPackagePathOrNull(record.inputPath_) || posixRelPath(record.inputPath_, posixDirname(item.inputPath_))
      let preEl = document.createElement('pre')
      let arrowEl = document.createElement('span')
      arrowEl.className = hasOwnProperty.call(entryPoints, record.inputPath_) ? styles.longArrow : styles.arrow

      if (record.kind_ === 'import-statement') {
        preEl.append(
          createSpanWithClass(styles.keyword, 'import '),
          createSpanWithClass(styles.string, JSON.stringify(originalPath)),
        )
        if (record.with_) {
          preEl.append(createSpanWithClass(styles.keyword, ' with '))
          appendImportAttributes(preEl, record.with_)
        }
        preEl.append(';')
        label = 'Imported file'
      }

      else if (record.kind_ === 'require-call') {
        preEl.append(
          'require(',
          createSpanWithClass(styles.string, JSON.stringify(originalPath)),
          ');',
        )
        label = 'Required file'
      }

      else if (record.kind_ === 'dynamic-import') {
        preEl.append(
          'import(',
          createSpanWithClass(styles.string, JSON.stringify(originalPath)),
        )
        if (record.with_) {
          preEl.append(', ')
          appendImportAttributes(preEl, { with: record.with_ })
        }
        preEl.append(');')
        label = 'Dynamically-imported file'
      }

      else if (record.kind_ === 'import-rule') {
        preEl.append(
          '@import ',
          createSpanWithClass(styles.string, JSON.stringify(originalPath)),
          ';',
        )
        label = 'Imported stylesheet'
      }

      else if (record.kind_ === 'url-token') {
        preEl.append(
          'url(',
          createSpanWithClass(styles.string, JSON.stringify(originalPath)),
          ')',
        )
        label = 'URL reference'
      }

      else {
        // This shouldn't happen
        return
      }

      targetEl.textContent = ' contains:\n'
      preEl.append(
        arrowEl,
        '\n',
      )
      outputFileEl.append(preEl)
    } else {
      labelEl.textContent = 'So ' + labelEl.textContent!.toLowerCase()
    }
  }
}

let appendImportAttributes = (el: HTMLElement, attrs: Record<string, string | Record<string, string>>): void => {
  let keys = Object.keys(attrs)
  if (keys.length === 0) {
    el.append('{}')
    return
  }
  el.append('{ ')
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i]
    let value = attrs[key]
    if (i > 0) el.append(', ')
    el.append(
      isIdentifier.test(key) ? key : createSpanWithClass(styles.string, JSON.stringify(key)),
      ': ',
    )
    if (typeof value === 'string') {
      el.append(createSpanWithClass(styles.string, JSON.stringify(value)))
    } else {
      appendImportAttributes(el, value)
    }
  }
  el.append(' }')
}
