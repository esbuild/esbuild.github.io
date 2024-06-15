// This file is responsible for spawning and terminating child worker threads.
// The worker thread is recreated every time the current API version changes.

import { afterConfigChange } from './mode'
import { OutputFile, showLoadingFailure, showLoadingMessage } from './output'
import { Version, setReloadWorkerCallback } from './versions'

// Behavior modifications via URL parameters:
//
//   ?polywasm=0
//     Force-disable the WebAssembly shim (for demonstration purposes)
//
//   ?polywasm=1
//     Force-enable the WebAssembly shim (for demonstration purposes)
//
//   ?pkgurl=http%3A%2F%2Flocalhost%3A8080
//     Load the "esbuild-wasm" package from "http://localhost:8080" (for local development)
//
const params = new URLSearchParams(location.search)
const polywasmParam = params.get('polywasm')
export const pkgurlParam = params.get('pkgurl')

export type IPCRequest = TransformRequest | BuildRequest
export type IPCResponse = TransformResponse & BuildResponse

export interface TransformRequest {
  command_: 'transform'
  input_: string
  options_: Record<string, any>
}

export interface TransformResponse {
  code_?: string
  map_?: string
  mangleCache_?: Record<string, string | boolean>
  legalComments_?: string
  stderr_?: string
}

export interface BuildRequest {
  command_: 'build'
  input_: Record<string, string>
  options_: Record<string, any>
}

export interface BuildResponse {
  outputFiles_?: OutputFile[]
  metafile_?: string
  mangleCache_?: Record<string, string | boolean>
  stderr_?: string
}

interface Task {
  message_: any
  resolve_: (value: any) => void
  abort_: () => void
}

const workerText = fetch('worker.js').then(r => r.text())
let activeTask: Task | null = null
let pendingTask: Task | null = null

let workerPromise = new Promise<Worker>((resolve, reject) => {
  setReloadWorkerCallback(version => {
    const reloadPromise = reloadWorker(version)
    reloadPromise.then(resolve, reject)
    setReloadWorkerCallback(version => {
      workerPromise.then(worker => worker.terminate())
      workerPromise = reloadWorker(version)
      return workerPromise
    })
    return reloadPromise
  })
})

async function packageFetch(subpath: string): Promise<Response> {
  const controller = new AbortController
  const timeout = setTimeout(() => controller.abort('Timeout'), 5000)

  // Try to fetch from one CDN, but fall back to another CDN if that fails
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/${subpath}`, { signal: controller.signal })
    if (response.ok) {
      clearTimeout(timeout)
      return response
    }
  } catch (err) {
    console.error(err)
  }
  return fetch(`https://unpkg.com/${subpath}`)
}

async function reloadWorker(version: Version): Promise<Worker> {
  let loadingFailure: string | undefined
  let promiseJS: Promise<Response>
  let promiseWASM: Promise<Response>

  showLoadingMessage(version === 'pkgurl' ? null : version)

  try {
    if (activeTask) activeTask.abort_()
    if (pendingTask) pendingTask.abort_()
    activeTask = null
    pendingTask = null

    if (version === 'pkgurl') {
      promiseJS = fetch(new URL(`lib/browser.min.js`, pkgurlParam!))
      promiseWASM = fetch(new URL(`esbuild.wasm`, pkgurlParam!))
    }

    else {
      // "browser.min.js" was added in version 0.8.33
      const [major, minor, patch] = version.split('.').map(x => +x)
      const min = major === 0 && (minor < 8 || (minor === 8 && patch < 33)) ? '' : '.min'

      promiseJS = packageFetch(`esbuild-wasm@${version}/lib/browser${min}.js`)
      promiseWASM = packageFetch(`esbuild-wasm@${version}/esbuild.wasm`)
    }

    const ensureOK = (promise: Promise<Response>) => promise.then(r => {
      if (!r.ok) throw `${r.status} ${r.statusText}: ${r.url}`
      return r
    })
    const polywasm = polywasmParam === '0' || polywasmParam === '1' ? polywasmParam : null
    const [workerJS, esbuildJS, esbuildWASM] = await Promise.all([
      workerText,
      ensureOK(promiseJS).then(r => r.text()),
      ensureOK(promiseWASM).then(r => r.arrayBuffer()),
    ])
    const parts = [esbuildJS, `\nvar polywasm=${polywasm};`, workerJS]
    const url = URL.createObjectURL(new Blob(parts, { type: 'application/javascript' }))

    return await new Promise<Worker>((resolve, reject) => {
      const worker = new Worker(url)
      worker.onmessage = e => {
        if (e.data.status_ === 'slow') {
          const slowEl = document.getElementById('slowWarning')!
          slowEl.innerHTML = '<span>⚠️ Processing is slow because </span><span>WebAssembly is disabled ⚠️</span>'
          slowEl.style.display = 'flex'
          return
        }
        worker.onmessage = null
        if (e.data.status_ === 'success') {
          resolve(worker)
          afterConfigChange()
        } else {
          reject(new Error('Failed to create worker'))
          loadingFailure = e.data.error_
        }
        URL.revokeObjectURL(url)
      }
      worker.postMessage([version, esbuildWASM], [esbuildWASM])
    })
  }

  catch (err) {
    showLoadingFailure(loadingFailure || err + '')
    throw err
  }
}

export function sendIPC(message: IPCRequest): Promise<IPCResponse> {
  const activateTask = (worker: Worker, task: Task): void => {
    if (activeTask) {
      if (pendingTask) pendingTask.abort_()
      pendingTask = task
    }

    else {
      activeTask = task
      worker.onmessage = e => {
        worker.onmessage = null
        task.resolve_(e.data)
        activeTask = null
        if (pendingTask) {
          activateTask(worker, pendingTask)
          pendingTask = null
        }
      }
      worker.postMessage(task.message_)
    }
  }

  return new Promise((resolve, reject) => {
    workerPromise.then(worker => activateTask(worker, {
      message_: serializeFunctions(message),
      resolve_: resolve,
      abort_: () => reject(new Error('Task aborted')),
    }), reject)
  })
}

// Hack: Serialize "Function" objects as "EvalError" objects instead
const serializeFunctions = (value: any): any => {
  if (typeof value === 'function') {
    const text = value + ''
    return new EvalError('function ' + value.name + text.slice(text.indexOf('(')))
  }
  if (typeof value === 'object' && value) {
    if (Array.isArray(value)) return value.map(serializeFunctions)
    else return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeFunctions(v)]))
  }
  return value
}
