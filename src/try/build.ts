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
  underLinkEl_: HTMLDivElement
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
    updateBuildOutput({ stderr_: prettyPrintErrorAsStderr(err as any) }, -1)
  }

  // Show an example link in the default state
  for (const block of blocks) {
    block.underLinkEl_.innerHTML = ''
  }
  if (!optionsEl.value && blocks.length === 1 && !blocks[0].contentEl_.value) {
    const a = document.createElement('a')
    a.href = 'javascript:void 0'
    a.textContent = 'Load an example...'
    a.onclick = () => setBuildState('--bundle\n--format=esm\n--outfile=out.js\n--sourcemap\n--drop-labels:DEBUG\n--minify-identifiers', [{
      isEntryPoint_: true,
      path_: 'entry.ts',
      content_: `\
// This import will be inlined by the bundler
import * as UnionFind from '@example/union-find'

// Type declarations are automatically removed
export type Graph<K, V> = Map<K, Node<K, V>>
export interface Node<K, V> {
  data: V
  edges: K[]
}

export function connectedComponents<K, V>(graph: Graph<K, V>) {
  let groups = UnionFind.create(graph.keys())
  let result = new Map<K, K[]>()

  for (let [key, { edges }] of graph)
    for (let edge of edges)
      UnionFind.union(groups, key, edge)

  // This is removed by "--drop-labels:DEBUG"
  DEBUG: console.log('Groups: ' +
    UnionFind.debugString(groups))

  for (let key of graph.keys()) {
    let group = UnionFind.find(groups, key)
    let component = result.get(group) || []
    component.push(key)
    result.set(group, component)
  }

  return [...result.values()]
}

// This is removed by "--drop-labels:DEBUG"
DEBUG: {
  let observed = JSON.stringify(
    connectedComponents(new Map([
      ['A', { data: 1, edges: ['C'] }],
      ['B', { data: 2, edges: ['B'] }],
      ['C', { data: 3, edges: ['A', 'B'] }],
      ['X', { data: -1, edges: ['Y'] }],
      ['Y', { data: -2, edges: ['X'] }],
      ['Z', { data: -3, edges: [] }],
    ])))
  let expected = '[["A","B","C"],["X","Y"],["Z"]]'
  console.assert(observed === expected,
    \`Expected \${expected} but got \${observed}\`)
}`,
    }, {
      isEntryPoint_: false,
      path_: 'node_modules/@example/union-find/index.js',
      content_: `\
// See: https://en.wikipedia.org/wiki/Disjoint-set_data_structure

export function create(keys) {
  let map = new Map()
  for (let x of keys)
    map.set(x, x)
  return map
}

export function find(map, x) {
  while (map.get(x) !== x)
    map.set(x, x = map.get(map.get(x)))
  return x
}

export function union(map, a, b) {
  map.set(find(map, a), find(map, b))
}

// This is removed by tree-shaking when unused
export function debugString(map) {
  let obj = {}
  for (let [k, v] of map) {
    obj[k] = v
    while (map.get(v) !== v)
      obj[k] += ' => ' + (v = map.get(v))
  }
  return JSON.stringify(obj, null, 2)
}`,
    }, {
      isEntryPoint_: false,
      path_: 'node_modules/@example/union-find/index.d.ts',
      content_: `\
// Files related to type checking are ignored by esbuild
export declare function create<T>(keys: Iterable<T>): Map<T, T>;
export declare function find<T>(map: Map<T, T>, x: T): T;
export declare function union<T>(map: Map<T, T>, a: T, b: T): void;
export declare function debugString<T>(map: Map<T, T>): string;`,
    }])
    blocks[0].underLinkEl_.append(a)
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
  const underLinkEl = document.createElement('div')
  const block: Block = {
    parentEl_: parentEl,
    pathEl_: pathEl,
    contentEl_: contentEl,
    underLinkEl_: underLinkEl,
  }
  let sourceMapLinkEl: HTMLAnchorElement | undefined

  disableAnnoyingBehaviors(pathEl, false)
  disableAnnoyingBehaviors(contentEl, false)
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
  underLinkEl.className = 'underLink'
  parentEl.append(entryEl, pathEl, removeEl, contentParentEl, underLinkEl)
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
