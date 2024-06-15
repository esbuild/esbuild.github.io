// This file is the entry point for the child web worker

declare const polywasm: 0 | 1 | null
declare const esbuild: any

import { resetFileSystem, stderrSinceReset } from './fs'
import { IPCRequest, IPCResponse } from './ipc'

// Add a WebAssembly shim for when WebAssembly isn't supported. This is the
// case when using Safari with Apple's Lockdown Mode enabled, for example.
import { WebAssembly as WASM } from 'polywasm/index.min.js'
if (polywasm === 1 || (!globalThis.WebAssembly && polywasm !== 0)) {
  (globalThis as any).WebAssembly = WASM
  postMessage({ status_: 'slow' })
}

interface API {
  transform(input: string, options: any): Promise<any>
  build(options: any): Promise<any>

  // This was added in version 0.10.1
  formatMessages?(messages: Message[], options: FormatMessagesOptions): Promise<any>
}

interface FormatMessagesOptions {
  kind: 'error' | 'warning'
  color?: boolean
  terminalWidth?: number
}

interface Message {
  text: string
  location: Location | null
  notes?: Note[]
}

interface Note {
  text: string
  location: Location | null
}

interface Location {
  file: string
  line: number
  column: number
  length: number
  lineText: string
  suggestion?: string
}

// Do the setup in an async function to capture errors thrown (e.g. "WebAssembly" doesn't exist)
const setup = async ([version, wasm]: [string | null, ArrayBuffer]): Promise<API> => {
  const options: Record<string, any> = {
    // This uses "wasmURL" instead of "wasmModule" because "wasmModule" was added in version 0.14.32
    wasmURL: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
  }

  // Avoid triggering an esbuild bug that causes all output to be empty
  if (version) {
    const [major, minor, patch] = version.split('.').map(x => +x)

    // Versions 0.5.20 to 0.8.34 have a bug where "worker" doesn't work. This
    // means that the "build" API is broken (because we can't inject our file
    // system shim) but the "transform" API still works, so we still allow
    // these buggy versions.
    const hasBugWithWorker = major === 0 && (
      (minor === 5 && patch >= 20) ||
      (minor >= 6 && minor <= 7) ||
      (minor === 8 && patch <= 34)
    )

    if (!hasBugWithWorker) {
      options.worker = false
    }
  } else {
    // Assume the package from "pkgurl" doesn't have this old bug
    options.worker = false
  }

  // Use the "startService" API before version 0.9.0
  if (esbuild.startService) {
    return await esbuild.startService(options)
  }

  // Otherwise use the "initialize" API
  await esbuild.initialize(options)
  return esbuild
}

const formatMessages = (api: API, messages: Message[], options: FormatMessagesOptions): Promise<string[]> => {
  if (api.formatMessages) return api.formatMessages(messages, options)

  // Do something reasonable for version 0.10.0 and earlier
  const format = (kind: string, text: string, location: Location | null): string => {
    let result = kind === 'note' ? '   ' : '\x1B[1m > '
    if (location) result += `${location.file}:${location.line}:${location.column}: `
    result += kind === 'error' ? '\x1B[31merror:\x1B[1m ' : kind === 'warning' ? '\x1B[35mwarning:\x1B[1m ' : '\x1B[1mnote:\x1B[0m '
    result += text + '\x1B[0m\n'
    if (location) {
      const { line, column, length, lineText } = location
      const prefix = line.toString().padStart(5)
      result += `\x1B[37m${prefix} │ ${lineText.slice(0, column)}` +
        `\x1B[32m${lineText.slice(column, column + length)}` +
        `\x1B[37m${lineText.slice(column + length)}\n` +
        `${' '.repeat(prefix.length)} ╵ \x1B[32m${' '.repeat(column)}${length > 1 ? '~'.repeat(length) : '^'}\x1B[0m\n`
    }
    return result
  }
  return Promise.resolve(messages.map(msg => {
    let result = format(options.kind, msg.text, msg.location)
    for (const note of msg.notes || []) {
      result += format('note', note.text, note.location)
    }
    return result + '\n'
  }))
}

// Hack: Deserialize "EvalError" objects as "Function" objects instead
const deserializeFunctions = (value: any): any => {
  if (typeof value === 'object' && value) {
    if (value instanceof EvalError) return new Function('return ' + value.message)()
    else if (Array.isArray(value)) return value.map(deserializeFunctions)
    else return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deserializeFunctions(v)]))
  }
  return value
}

onmessage = e => {
  setup(e.data).then(api => {
    onmessage = e => {
      const respondWithError = (
        respond: (response: IPCResponse) => void,
        err: Error & { errors?: any[], warnings?: any[] },
      ): void => {
        let errors = err && err.errors
        let warnings = err && err.warnings
        if (!errors && !warnings) errors = [{ text: err + '' }]
        Promise.all([
          errors ? formatMessages(api, errors, { kind: 'error', color }) : [],
          warnings ? formatMessages(api, warnings, { kind: 'warning', color }) : [],
        ]).then(([errors, warnings]) => {
          respond({
            stderr_: [...errors, ...warnings].join(''),
          })
        })
      }

      // There are two sources of log information: the log messages returned through
      // the API and the stderr stream from WebAssembly. The returned log messages
      // are likely colored while the stderr stream from WebAssembly likely isn't, so
      // we prefer the messages from the API. However, don't want to omit unique
      // information from WebAssembly such as verbose log messages. Remove duplicate
      // log information so each message is only shown once.
      const mergeStderrStreams = (formatted: string[], stderr: string): string => {
        for (const text of formatted) {
          const replaced = stderr.replace(text, '')
          if (replaced !== stderr) {
            // Try with escape codes
            stderr = replaced
          } else {
            // Try without escape codes
            const replaced = text.replace(/\x1B\[[^m]*m/g, '')
            if (replaced !== text) {
              stderr = stderr.replace(replaced, '')
            }
          }
        }
        return formatted.join('') + stderr
      }

      const finish = (warnings: any[], done: (stderr: string) => void): void => {
        if (warnings.length) {
          formatMessages(api, warnings, { kind: 'warning', color })
            .then(formatted => done(mergeStderrStreams(formatted, stderrSinceReset)))
        } else {
          done(stderrSinceReset)
        }
      }

      const request: IPCRequest = deserializeFunctions(e.data)
      const respond: (response: IPCResponse) => void = postMessage
      let color = true

      try {
        // Transform API
        if (request.command_ === 'transform') {
          if (request.options_.color === false) color = false
          resetFileSystem({})
          api.transform(request.input_, request.options_).then(
            ({ code, map, js, jsSourceMap, warnings, mangleCache, legalComments }) =>
              finish(warnings, (stderr: string) => respond({
                // "code" and "map" were "js" and "jsSourceMap" before version 0.8.0
                code_: code ?? js,
                map_: map ?? jsSourceMap,
                mangleCache_: mangleCache,
                legalComments_: legalComments,
                stderr_: stderr,
              })),
            err => respondWithError(respond, err),
          )
        }

        // Build API
        else if (request.command_ === 'build') {
          if (request.options_.color === false) color = false
          resetFileSystem(request.input_)
          api.build(request.options_).then(
            ({ warnings, outputFiles, metafile, mangleCache }) =>
              finish(warnings, (stderr: string) => respond({
                outputFiles_: outputFiles,
                metafile_: metafile,
                mangleCache_: mangleCache,
                stderr_: stderr,
              })),
            err => respondWithError(respond, err),
          )
        }
      } catch (err) {
        respondWithError(respond, err)
      }
    }

    postMessage({
      status_: 'success',
    })
  }).catch(err => {
    console.error(err)
    postMessage({
      status_: 'failure',
      error_: err + '',
    })
  })
}
