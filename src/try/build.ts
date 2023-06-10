// This file implements UI panel for the "build" API call

import { sendIPC } from './ipc'
import { Mode } from './mode'
import { parseOptions } from './options'
import { disableAnnoyingBehaviors, prettyPrintErrorAsStderr, resetHeight, updateBuildOutput } from './output'
import { tryToSaveStateToHash } from './share'
import { generateSourceMapLink, toggleInlineSourceMapLink } from './sourcemap'

export interface BuildInput {
  isEntryPoint_: boolean
  path_: string
  content_: string
}

interface Block {
  parentEl_: HTMLDivElement
  pathEl_: HTMLInputElement
  contentEl_: HTMLTextAreaElement
}

const optionsEl = document.querySelector('#buildOptions textarea') as HTMLTextAreaElement
const optionsSwitcherEl = document.querySelector('#buildOptions .underLink') as HTMLDivElement
const addInputEl = document.getElementById('addInput') as HTMLAnchorElement
const inputsEl = document.getElementById('buildInputs') as HTMLDivElement
const blocks: Block[] = []

export function getBuildState(): [options: string, inputs: BuildInput[]] {
  return [optionsEl.value, blocks.map(input => ({
    isEntryPoint_: input.parentEl_.classList.contains('entryPoint'),
    path_: input.pathEl_.value.trim(),
    content_: input.contentEl_.value,
  }))]
}

export function setBuildState(options: string, inputs: BuildInput[]): void {
  if (JSON.stringify([options, inputs]) !== JSON.stringify(getBuildState())) {
    for (const block of blocks) {
      block.parentEl_.remove()
    }
    blocks.length = 0
    optionsEl.value = options
    for (const input of inputs) {
      addBlock(input.isEntryPoint_, input.path_, input.content_)
    }
    updateAddInputText()
    runBuild()
  }
  resetBuildPanelHeights()
}

export function addBuildInputIfNone(): void {
  if (!blocks.length) {
    addBlock(true, generateUniqueName())
  }
}

export function resetBuildPanelHeights(): void {
  resetHeight(optionsEl)
  for (const block of blocks) {
    resetHeight(block.contentEl_)
  }
}

export function runBuild(): void {
  tryToSaveStateToHash()

  try {
    const options = parseOptions(optionsEl.value, Mode.Build, optionsSwitcherEl)
    const entryPoints = Array.isArray(options.entryPoints) ? options.entryPoints : options.entryPoints = []
    const input: Record<string, string> = Object.create(null)
    const duplicates: Record<string, Block[]> = Object.create(null)
    let err: Error | undefined

    for (const block of blocks) {
      const path = block.pathEl_.value.trim()
      const samePath = duplicates[path] || (duplicates[path] = [])
      samePath.push(block)
      if (!path) {
        const stdin = options.stdin && typeof options.stdin === 'object' ? options.stdin : options.stdin = {}
        stdin.contents = block.contentEl_.value
        if (!('resolveDir' in stdin)) stdin.resolveDir = '/'
      } else {
        input[path] = block.contentEl_.value
        if (block.parentEl_.classList.contains('entryPoint') && !entryPoints.includes(path)) {
          entryPoints.push(path)
        }
      }
    }

    for (const path in duplicates) {
      const samePath = duplicates[path]
      if (samePath.length > 1) {
        for (const block of samePath) {
          block.parentEl_.classList.add('duplicate')
        }
        err ||= new Error('Duplicate input file: ' + (path ? JSON.stringify(path) : '<stdin>'))
      } else {
        samePath[0].parentEl_.classList.remove('duplicate')
      }
    }
    if (err) throw err

    sendIPC({
      command_: 'build',
      input_: input,
      options_: options,
    }).then(result => {
      updateBuildOutput(result, entryPoints.length)
    }, () => {
      // Swallow errors (e.g. "task aborted" or "failed to create worker")
    })
  }

  catch (err) {
    updateBuildOutput({ stderr_: prettyPrintErrorAsStderr(err) }, -1)
  }
}

function generateUniqueName(): string {
  if (!blocks.length) return 'entry.js'
  let count = 1
  let name = 'file.js'
  while (blocks.some(block => block.pathEl_.value.trim() === name)) {
    name = `file${++count}.js`
  }
  return name
}

function updateAddInputText(): void {
  addInputEl.textContent = '+ ' + generateUniqueName()
}

function addBlock(isEntryPoint = false, path = '', content = ''): Block {
  const updateSourceMapLink = (): void => {
    const path = pathEl.value

    // Source maps get a visualization link
    if (path.endsWith('.map')) {
      let json: any
      try {
        json = JSON.parse(contentEl.value)
      } catch {
      }
      if (json && typeof json === 'object') {
        sourceMapLinkEl = generateSourceMapLink(() => {
          let code = ''
          for (const block of blocks) {
            if (path === block.pathEl_.value + '.map') {
              code = block.contentEl_.value
              break
            }
          }
          return [code, JSON.stringify(json)]
        })
        parentEl.append(sourceMapLinkEl)
        return
      }
    }

    // Code with an inline source map gets a visualization link
    sourceMapLinkEl = toggleInlineSourceMapLink(parentEl, contentEl.value, sourceMapLinkEl)
  }

  const parentEl = document.createElement('div')
  const entryEl = document.createElement('a')
  const removeEl = document.createElement('a')
  const pathEl = document.createElement('input')
  const contentParentEl = document.createElement('div')
  const contentEl = document.createElement('textarea')
  const block: Block = {
    parentEl_: parentEl,
    pathEl_: pathEl,
    contentEl_: contentEl,
  }
  let sourceMapLinkEl: HTMLAnchorElement | undefined

  disableAnnoyingBehaviors(pathEl)
  disableAnnoyingBehaviors(contentEl)
  pathEl.placeholder = '<stdin>'
  pathEl.value = path
  entryEl.className = 'entryToggle'
  entryEl.textContent = ''
  entryEl.href = 'javascript:void 0'
  removeEl.className = 'remove'
  removeEl.textContent = '\xD7'
  removeEl.href = 'javascript:void 0'
  contentEl.placeholder = '(enter your code here)'
  contentEl.value = content
  parentEl.className = 'buildInput'
  if (isEntryPoint) parentEl.classList.add('entryPoint')
  contentParentEl.className = 'hasLabel'
  contentParentEl.append(contentEl)
  parentEl.append(entryEl, pathEl, removeEl, contentParentEl)
  inputsEl.insertBefore(parentEl, addInputEl)

  pathEl.oninput = () => {
    updateSourceMapLink()
    updateAddInputText()
    runBuild()
  }

  pathEl.onblur = () => {
    const trimmed = pathEl.value.trim()
    if (pathEl.value !== trimmed) {
      pathEl.value = trimmed
      updateAddInputText()
      runBuild()
    }
  }

  contentEl.oninput = () => {
    updateSourceMapLink()
    resetHeight(contentEl)
    runBuild()
  }

  entryEl.onclick = () => {
    parentEl.classList.toggle('entryPoint')
    runBuild()
  }

  removeEl.onclick = () => {
    const index = blocks.indexOf(block)
    if (index < 0) return
    blocks.splice(index, 1)
    parentEl.remove()
    updateAddInputText()
    runBuild()
  }

  blocks.push(block)
  updateSourceMapLink()
  updateAddInputText()
  resetHeight(contentEl)
  return block
}

optionsEl.oninput = () => {
  resetHeight(optionsEl)
  runBuild()
}

addInputEl.onclick = () => {
  const block = addBlock(!blocks.length, generateUniqueName())
  block.pathEl_.focus()
  block.pathEl_.select()
  runBuild()
}

addEventListener('resize', resetBuildPanelHeights)
updateAddInputText()
