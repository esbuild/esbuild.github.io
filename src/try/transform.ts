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
  const input = inputEl.value
  tryToSaveStateToHash()

  // Code with an inline source map gets a visualization link
  sourceMapLinkEl = toggleInlineSourceMapLink(inputEl.parentElement!, input, sourceMapLinkEl)

  try {
    sendIPC({
      command_: 'transform',
      input_: input,
      options_: parseOptions(optionsEl.value, Mode.Transform, optionsSwitcherEl),
    }).then(result => {
      updateTransformOutput(result)
    }, () => {
      // Swallow errors (e.g. "task aborted" or "failed to create worker")
    })
  }

  catch (err) {
    updateTransformOutput({ stderr_: prettyPrintErrorAsStderr(err) })
  }
}

optionsEl.oninput = () => {
  resetHeight(optionsEl)
  runTransform()
}

inputEl.oninput = () => {
  resetHeight(inputEl)
  runTransform()
}

addEventListener('resize', resetTransformPanelHeights)
resetTransformPanelHeights()
