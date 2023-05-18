// This file handles the mode switcher (between "transform" and "build")

import { addBuildInputIfNone, resetBuildPanelHeights, runBuild } from './build'
import { showLoadingMessage } from './output'
import { resetTransformPanelHeights, runTransform } from './transform'

export const enum Mode {
  Transform,
  Build,
}

export let currentMode = Mode.Transform

const modePanesEl = [
  document.getElementById('transformPanel') as HTMLDivElement,
  document.getElementById('buildPanel') as HTMLDivElement,
]
const modeSwitcherEl = document.getElementById('modeSwitcher') as HTMLDivElement
const modesEl = modeSwitcherEl.querySelectorAll('a')

modesEl[Mode.Transform].onclick = () => {
  if (setMode(Mode.Transform)) {
    showLoadingMessage(null)
    afterConfigChange()
  }
}

modesEl[Mode.Build].onclick = () => {
  addBuildInputIfNone()
  if (setMode(Mode.Build)) {
    showLoadingMessage(null)
    afterConfigChange()
  }
}

export function setMode(mode: Mode): boolean {
  if (currentMode === mode) return false
  modesEl[currentMode].classList.remove('active')
  modePanesEl[currentMode].style.display = 'none'
  currentMode = mode
  modesEl[currentMode].classList.add('active')
  modePanesEl[currentMode].style.display = 'block'
  return true
}

export function afterConfigChange(): void {
  if (currentMode === Mode.Transform) {
    resetTransformPanelHeights()
    runTransform()
  } else {
    resetBuildPanelHeights()
    runBuild()
  }
}
