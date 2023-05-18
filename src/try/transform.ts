// This file implements UI panel for the "transform" API call

import { sendIPC } from './ipc'
import { Mode } from './mode'
import { parseOptions } from './options'
import { prettyPrintErrorAsStderr, resetHeight, updateTransformOutput } from './output'
import { tryToSaveStateToHash } from './share'

const optionsEl = document.querySelector('#transformOptions textarea') as HTMLTextAreaElement
const inputEl = document.querySelector('#transformInput textarea') as HTMLTextAreaElement

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
  tryToSaveStateToHash()

  try {
    sendIPC({
      command_: 'transform',
      input_: inputEl.value,
      options_: parseOptions(optionsEl.value, Mode.Transform),
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
