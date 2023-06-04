// This file implements the UI for the output panel (the right half of the UI)

import { BuildResponse, TransformResponse } from './ipc'
import { Mode, currentMode } from './mode'
import { generateSourceMapLink, toggleInlineSourceMapLink } from './sourcemap'

export interface OutputFile {
  path: string
  text: string
}

const outputResultEl = document.getElementById('outputResult') as HTMLDivElement
const transformOutputEl = document.createElement('textarea')
const legalCommentsEl = document.createElement('textarea')
const mangleCacheEl = document.createElement('textarea')
const metafileEl = document.createElement('textarea')
const sourceMapEl = document.createElement('textarea')
const buildOutputEls: HTMLTextAreaElement[] = []
let sourceMapLinkEl: HTMLAnchorElement | undefined
let loadingFailure = false

disableAnnoyingBehaviors(transformOutputEl, true)
disableAnnoyingBehaviors(legalCommentsEl, true)
disableAnnoyingBehaviors(mangleCacheEl, true)
disableAnnoyingBehaviors(metafileEl, true)
disableAnnoyingBehaviors(sourceMapEl, true)

export function resetHeight(el: HTMLTextAreaElement): void {
  // Temporarily pad the body out by the old height so the body doesn't scroll back up
  document.body.style.paddingBottom = el.clientHeight + 'px'
  el.style.height = '0'
  el.style.height = el.scrollHeight + 1 + 'px'
  document.body.style.paddingBottom = '0'
}

export function disableAnnoyingBehaviors(el: HTMLTextAreaElement | HTMLInputElement, readOnly = false): void {
  el.readOnly = readOnly
  el.spellcheck = false
  el.autocapitalize = 'off'
  el.autocomplete = 'off'
}

export function prettyPrintErrorAsStderr(err: RichError): string {
  let text = `\x1B[31m✘ \x1B[41;31m[\x1B[41;97mERROR\x1B[41;31m]\x1B[0m \x1B[1m${(err && err.message) || err}\x1B[0m`
  const location = err && err.location_
  const notes = err && err.notes_
  if (location) text += prettyPrintLocationAsStderr(location)
  if (notes) {
    for (const note of notes) {
      text += `\n  ${note.text_}`
      if (note.location_) text += prettyPrintLocationAsStderr(note.location_)
    }
  }
  return text
}

export type RichError = Error & { location_?: Location, notes_: { text_: string, location_?: Location }[] }

export interface Location {
  file_: string
  line_: number // 1-based
  column_: number // 0-based, in UTF-16 code units
  length_: number // in UTF-16 code units
  lineText_: string
  suggestion_?: string
}

function prettyPrintLocationAsStderr({ file_, line_, column_, length_, lineText_, suggestion_ }: Location): string {
  let last = length_ < 2 ? '^' : '~'.repeat(length_)
  let result = `\n\n    ${file_}:${line_}:${column_}:\n`
  result += `\x1B[37m${line_.toString().padStart(7)} │ ${lineText_.slice(0, column_)}` +
    `\x1B[32m${lineText_.slice(column_, column_ + length_)}` +
    `\x1B[37m${lineText_.slice(column_ + length_)}\n`
  if (suggestion_) {
    result += `        │ ${' '.repeat(column_)}\x1B[32m${last}\x1B[37m\n`
    last = suggestion_
  }
  result += `        ╵ ${' '.repeat(column_)}\x1B[32m${last}\x1B[0m\n`
  return result
}

function appendTextarea(textarea: HTMLTextAreaElement, id: string, text: string | undefined): void {
  if (text !== undefined) {
    const div = document.createElement('div')
    textarea.textContent = text.replace(/\n$/, '')
    div.id = id
    div.className = 'hasLabel'
    div.append(textarea)
    outputResultEl.append(div)
    resetHeight(textarea)
  }
}

export function updateTransformOutput({ code_, map_, mangleCache_, legalComments_, stderr_ }: TransformResponse): void {
  outputResultEl.innerHTML = ''

  appendTextarea(transformOutputEl, 'transformOutput', code_)

  if (map_) {
    appendTextarea(sourceMapEl, 'sourceMap', map_)

    // Source maps get a visualization link
    if (sourceMapLinkEl) sourceMapLinkEl.remove()
    sourceMapLinkEl = generateSourceMapLink(() => [code_ || '', JSON.stringify(JSON.parse(map_))])
    sourceMapEl.parentElement!.append(sourceMapLinkEl)
  }

  // Code with an inline source map gets a visualization link
  else {
    sourceMapLinkEl = toggleInlineSourceMapLink(transformOutputEl.parentElement!, code_ || '', sourceMapLinkEl)
  }

  if (mangleCache_) appendTextarea(mangleCacheEl, 'transformMangleCache', JSON.stringify(mangleCache_, null, 2))
  appendTextarea(legalCommentsEl, 'legalComments', legalComments_)

  if (stderr_) {
    const div = document.createElement('div')
    div.id = 'stderrLog'
    div.innerHTML = terminalEscapeCodesToHTML(stderr_)
    outputResultEl.append(div)
  }

  if (code_ === undefined && !stderr_) {
    const div = document.createElement('div')
    div.id = 'outputStatus'
    div.textContent = '(no output)'
    outputResultEl.append(div)
  }
}

export function updateBuildOutput({ outputFiles_, metafile_, mangleCache_, stderr_ }: BuildResponse, entryPointCount: number): void {
  outputResultEl.innerHTML = ''
  buildOutputEls.length = 0

  if (outputFiles_) {
    // Sort generated source maps after the file they apply to
    outputFiles_.sort((a, b) => +(a.path > b.path) - +(a.path < b.path))

    for (const file of outputFiles_) {
      const div = document.createElement('div')
      const outputPath = document.createElement('div')
      const textarea = document.createElement('textarea')
      outputPath.className = 'outputPath'
      outputPath.textContent = file.path.replace(/^\//, '')
      textarea.readOnly = true
      textarea.value = file.text.replace(/\n$/, '')
      disableAnnoyingBehaviors(textarea)
      div.className = 'buildOutput hasLabel'
      div.append(textarea)

      // Source maps get a visualization link
      if (file.path.endsWith('.map')) {
        for (const codeFile of outputFiles_) {
          if (file.path === codeFile.path + '.map') {
            div.append(generateSourceMapLink(() => [
              codeFile.text,
              JSON.stringify(JSON.parse(file.text)), // Make the JSON slightly smaller
            ]))
            break
          }
        }
      }

      // Code with an inline source map gets a visualization link
      else {
        toggleInlineSourceMapLink(div, file.text, undefined)
      }

      outputResultEl.append(outputPath, div)
      buildOutputEls.push(textarea)
      resetHeight(textarea)
    }
  }

  if (stderr_) {
    const div = document.createElement('div')
    div.id = 'stderrLog'
    div.innerHTML = terminalEscapeCodesToHTML(stderr_)
    outputResultEl.append(div)
  }

  if ((!outputFiles_ || !outputFiles_.length) && !stderr_) {
    const div = document.createElement('div')
    div.id = 'outputStatus'
    div.textContent = entryPointCount ? '(no output)' : '(no entry points)'
    outputResultEl.append(div)
  }

  if (mangleCache_) appendTextarea(mangleCacheEl, 'mangleCache', JSON.stringify(mangleCache_, null, 2))
  if (metafile_) appendTextarea(metafileEl, 'metafile', JSON.stringify(metafile_, null, 2))
}

export function showLoadingMessage(version: string | null): void {
  if (version) loadingFailure = false
  if (loadingFailure) return
  outputResultEl.innerHTML = `<span id="outputStatus">Loading${version ? ' version ' + version : ''}...</span>`
}

export function showLoadingFailure(error: string): void {
  loadingFailure = true
  outputResultEl.innerHTML = ''
  const div = document.createElement('div')
  div.className = 'problem'
  div.innerHTML = `\u274C Failed to load esbuild: ${error}`
  outputResultEl.append(div)
}

function terminalEscapeCodesToHTML(text: string): string {
  return '<span>' +
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\033\[([^m]*)m/g, (_, escape) => {
        switch (escape) {
          case '1': return '</span><span class="color-bold">'
          case '31': return '</span><span class="color-red">'
          case '32': return '</span><span class="color-green">'
          case '33': return '</span><span class="color-yellow">'
          case '35': return '</span><span class="color-magenta">' // This is generated by warnings in version 0.14.0 and earlier
          case '37': return '</span><span class="color-dim">'
          case '41;31': return '</span><span class="bg-red color-red">'
          case '41;97': return '</span><span class="bg-red color-white">'
          case '43;33': return '</span><span class="bg-yellow color-yellow">'
          case '43;30': return '</span><span class="bg-yellow color-black">'
          case '0': return '</span><span>'
        }
        throw new Error(`Unknown escape sequence: ${escape}`)
      }) +
    '</span>'
}

addEventListener('resize', () => {
  if (currentMode === Mode.Transform) {
    resetHeight(transformOutputEl)
    resetHeight(sourceMapEl)
    resetHeight(legalCommentsEl)
  } else {
    for (const el of buildOutputEls) {
      resetHeight(el)
    }
    resetHeight(metafileEl)
  }
  resetHeight(mangleCacheEl)
})
