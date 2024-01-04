// This file implements UI panel for the "transform" API call

import { sendIPC } from './ipc'
import { Mode } from './mode'
import { parseOptions } from './options'
import { prettyPrintErrorAsStderr, resetHeight, updateTransformOutput } from './output'
import { tryToSaveStateToHash } from './share'
import { toggleInlineSourceMapLink } from './sourcemap'

const optionsEl = document.querySelector('#transformOptions textarea') as HTMLTextAreaElement
const optionsSwitcherEl = document.querySelector('#transformOptions .underLink') as HTMLDivElement
const inputEl = document.querySelector('#transformInput textarea') as HTMLTextAreaElement
const exampleEl = document.querySelector('#transformInput .underLink') as HTMLTextAreaElement
let sourceMapLinkEl: HTMLAnchorElement | undefined

export function getTransformState(): [options: string, input: string] {
  return [optionsEl.value, inputEl.value]
}

export function setTransformState(options: string, input: string): void {
  if (optionsEl.value !== options || inputEl.value !== input) {
    optionsEl.value = options
    inputEl.value = input
    runTransform()
  }
  resetTransformPanelHeights()
}

export function resetTransformPanelHeights(): void {
  resetHeight(optionsEl)
  resetHeight(inputEl)
}

export function runTransform(): void {
  const options = optionsEl.value
  const input = inputEl.value
  tryToSaveStateToHash()

  // Code with an inline source map gets a visualization link
  sourceMapLinkEl = toggleInlineSourceMapLink(inputEl.parentElement!, input, sourceMapLinkEl)

  try {
    sendIPC({
      command_: 'transform',
      input_: input,
      options_: parseOptions(options, Mode.Transform, optionsSwitcherEl),
    }).then(result => {
      updateTransformOutput(result)
    }, () => {
      // Swallow errors (e.g. "task aborted" or "failed to create worker")
    })
  }

  catch (err) {
    updateTransformOutput({ stderr_: prettyPrintErrorAsStderr(err) })
  }

  // Show an example link in the default state
  exampleEl.innerHTML = ''
  if (!options && !input) {
    const a = document.createElement('a')
    a.href = 'javascript:void 0'
    a.textContent = 'Load an example...'
    a.onclick = loadExample
    exampleEl.append(a)
  }
}

function loadExample(): void {
  setTransformState('--target=es6\n--loader=tsx\n--jsx=automatic\n--minify-identifiers\n--sourcemap', `\
// The "tsx" loader removes type annotations
export type NamesProps = { names?: string[] }

export const NamesComponent = (props: NamesProps) => {
  // The "?." operator will be transformed for ES6
  const names = props.names?.join(' ')

  // The "tsx" loader transforms JSX syntax into JS
  return <div>Names: {names}</div>
}`)
}

optionsEl.oninput = () => {
  resetHeight(optionsEl)
  runTransform()
}

inputEl.oninput = () => {
  resetHeight(inputEl)
  runTransform()
}

exampleEl.querySelector('a')!.onclick = loadExample
addEventListener('resize', resetTransformPanelHeights)
resetTransformPanelHeights()
