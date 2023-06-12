// This file implements syncing state with the location hash in the URL bar

import { BuildInput, getBuildState, setBuildState } from './build'
import { Mode, currentMode, setMode } from './mode'
import { getTransformState, setTransformState } from './transform'
import { Version, tryToGetCurrentVersion, tryToSetCurrentVersion } from './versions'

const enum Tag {
  Transform = 't',
  Build = 'b',
}

export function loadStateFromHash(): boolean {
  const hash = location.hash
  const parts = atob(hash.slice(1)).split('\0')

  // Transform mode
  if (parts[0] === Tag.Transform && parts.length === 4) {
    setMode(Mode.Transform)
    setTransformState(parts[2], parts[3])
    tryToSetCurrentVersion(parts[1] as Version)
    return true
  }

  // Build mode
  if (parts[0] === Tag.Build && parts.length % 3 === 0) {
    const inputs: BuildInput[] = []
    for (let i = 3; i < parts.length; i += 3) {
      inputs.push({
        isEntryPoint_: parts[i] === 'e',
        path_: parts[i + 1],
        content_: parts[i + 2],
      })
    }
    setMode(Mode.Build)
    setBuildState(parts[2], inputs)
    tryToSetCurrentVersion(parts[1] as Version)
    return true
  }

  // Clear out an invalid hash and reset the UI
  if (location.hash !== '') {
    try {
      history.replaceState({}, '', location.pathname + location.search)
    } catch (e) {
    }
  }
  return false
}

export function tryToSaveStateToHash(): void {
  const currentVersion = tryToGetCurrentVersion()
  if (!currentVersion) return
  let parts: string[] | undefined

  // Transform mode
  if (currentMode === Mode.Transform) {
    const [options, input] = getTransformState()
    if (options || input) parts = [Tag.Transform, currentVersion, options, input]
  }

  // Build mode
  else {
    const [options, inputs] = getBuildState()
    parts = [Tag.Build, currentVersion, options]
    for (const input of inputs) {
      parts.push(input.isEntryPoint_ ? 'e' : '', input.path_, input.content_)
    }
  }

  // Try to save our state to the URL hash
  const reset = location.pathname + location.search
  try {
    const hash = parts ? '#' + btoa(parts.join('\0')).replace(/=+$/, '') : ''
    if (location.hash !== hash) {
      history.replaceState({}, '', hash || reset)
    }
  } catch (e) {
    // Push an empty hash instead if it's too big for a URL
    if (location.hash !== '') {
      try {
        history.replaceState({}, '', reset)
      } catch (e) {
      }
    }
  }
}
