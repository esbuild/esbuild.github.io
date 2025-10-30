// This file parses the API options textbox into a JS object that can be passed
// to esbuild's JS API. It supports both CLI-style options (e.g. "--minify")
// and JS-style options (e.g. "{ minify: true "). JS-style options are parsed
// using a loose JSON syntax that's basically JSON5 with regular expressions.

import { Mode } from './mode'
import { RichError } from './output'

const enum Kind {
  // These must be in the order "-,:[]{}()+"
  Minus,
  Comma,
  Colon,
  OpenBracket,
  CloseBracket,
  OpenBrace,
  CloseBrace,
  OpenParen,
  CloseParen,
  Plus,

  // The order doesn't matter for these
  Identifier,
  Function,
  Literal,
  String,
}

const enum Flags {
  None = 0,
  KeywordsAreIdentifiers = 1 << 0,
  ExpectEndOfFile = 1 << 1,
}

interface Token {
  line_: number
  column_: number
  kind_: Kind
  text_: string
  value_: any
}

const commaSeparatedArrays = [
  'absPaths',
  'conditions',
  'dropLabels',
  'mainFields',
  'resolveExtensions',
  'target',
]

export function parseOptions(input: string, mode: Mode, switcherEl: HTMLDivElement | undefined): Record<string, any> {
  const trimmed = input.trimStart()
  const isJSON = /^{|^\/[*/]/.test(trimmed)
  let options: Record<string, any>

  if (!trimmed) {
    if (switcherEl) switcherEl.innerHTML = ''
    return {}
  }

  if (isJSON) {
    options = parseOptionsAsLooseJSON(input)
  } else {
    const toRegExp = (key: string): void => {
      if (options[key] !== undefined) {
        try {
          options[key] = new RegExp(options[key] + '')
        } catch (err) {
          key = key.replace(/[A-Z]/g, x => '-' + x.toLowerCase())
          throw new Error(`Invalid regular expression for "--${key}=": ${(err as Error).message}`)
        }
      }
    }

    const toNumber = (key: string): void => {
      if (options[key] !== undefined) {
        try {
          options[key] = +options[key]
        } catch (err) {
          key = key.replace(/[A-Z]/g, x => '-' + x.toLowerCase())
          throw new Error(`Invalid number for "--${key}=": ${(err as Error).message}`)
        }
      }
    }

    options = parseOptionsAsShellArgs(input, mode)

    // These need to be numbers, not strings or booleans
    toNumber('logLimit')
    toNumber('lineLimit')

    // These need to be regular expressions, not strings or booleans
    toRegExp('mangleProps')
    toRegExp('reserveProps')

    // These need to be arrays, not comma-separated strings or booleans
    for (const key of commaSeparatedArrays) {
      if (options[key] !== undefined) {
        options[key] = (options[key] + '').split(',')
      }
    }

    // Map entries for "supported" must be booleans, not strings (but map
    // entries for other maps such as "define" or "banner" must be strings,
    // so only do this for "supported")
    const supported = options['supported']
    if (typeof supported === 'object' && supported !== null) {
      for (const key in supported) {
        if (supported[key] === 'true') supported[key] = true
        else if (supported[key] === 'false') supported[key] = false
      }
    }
  }

  // Parsing this makes it more readable when printing it as JSON
  let tsconfigRaw = options['tsconfigRaw']
  if (tsconfigRaw !== undefined) {
    try {
      tsconfigRaw = JSON.parse(tsconfigRaw)
    } catch {
    }
  }

  // Optionally add additional UI if relevant
  if (switcherEl) {
    switcherEl.innerHTML = ''
    addTypeScriptExperimentalDecoratorUI(switcherEl, isJSON, options, tsconfigRaw, input)
    addSyntaxSwitcherUI(switcherEl, isJSON, options, tsconfigRaw)
  }

  return options
}

// Make it easier to enable TypeScript decorators
function addTypeScriptExperimentalDecoratorUI(el: HTMLElement, isJSON: boolean, options: Readonly<Record<string, any>>, tsconfigRaw: any, input: string): void {
  if (tsconfigRaw === undefined) tsconfigRaw = {}
  if (typeof tsconfigRaw !== 'object') return

  let compilerOptions = tsconfigRaw.compilerOptions
  if (compilerOptions === undefined) compilerOptions = {}
  if (typeof compilerOptions !== 'object') return

  if ((options.loader === 'ts' || options.loader === 'tsx') && typeof compilerOptions.experimentalDecorators !== 'boolean') {
    const newOptions = {
      ...options,
      tsconfigRaw: {
        ...tsconfigRaw,
        compilerOptions: {
          ...compilerOptions,
          experimentalDecorators: true,
        },
      },
    }

    let args: string | undefined
    if (isJSON) {
      args = printOptionsAsLooseJSON(newOptions)
    } else if (options['tsconfigRaw'] === undefined) {
      args = [
        input,
        /\n/.test(input) ? '\n' : ' ',
        printOptionsAsShellArgs({ tsconfigRaw: newOptions.tsconfigRaw }),
      ].join('')
    } else {
      try {
        args = printOptionsAsShellArgs(newOptions)
      } catch {
        // Not every JSON5 object is representable as CLI options, but that's ok
      }
    }

    if (args !== undefined) {
      const a = document.createElement('a')
      a.href = 'javascript:void 0'
      a.textContent = 'Enable TS experimental decorators'
      a.onclick = () => {
        const textareaEl = el.parentElement!.querySelector('textarea')!
        el.innerHTML = ''
        textareaEl.value = args!
        textareaEl.dispatchEvent(new Event('input'))
      }
      el.append(a, ' ')
    }
  }
}

// Provide a way to switch between the two option syntaxes
function addSyntaxSwitcherUI(el: HTMLElement, isJSON: boolean, options: Readonly<Record<string, any>>, tsconfigRaw: any): void {
  let args: string | undefined
  const a = document.createElement('a')

  if (isJSON) {
    try {
      args = printOptionsAsShellArgs(options)
      a.textContent = 'Switch to CLI syntax'
    } catch {
      // Not every JSON5 object is representable as CLI options, but that's ok
    }
  } else {
    args = printOptionsAsLooseJSON(tsconfigRaw ? { ...options, tsconfigRaw } : options)
    a.textContent = 'Switch to JS syntax'
  }

  if (args !== undefined) {
    a.href = 'javascript:void 0'
    a.onclick = () => {
      const textareaEl = el.parentElement!.querySelector('textarea')!
      el.innerHTML = ''
      textareaEl.value = args!
      textareaEl.dispatchEvent(new Event('input'))
    }
    el.append(a)
  }
}

function parseOptionsAsShellArgs(input: string, mode: Mode): Record<string, any> {
  type Arg = { text_: string, line_: number, column_: number, length_: number }
  const args: Arg[] = []
  const n = input.length
  let line = 0
  let lineStart = 0
  let i = 0

  while (i < n) {
    const argStart = i
    const argLine = line
    const argColumn = i - lineStart
    let arg = ''
    let c = input[i]

    // Skip over whitespace
    if (c === ' ' || c === '\t' || c === '\n') {
      i++
      if (c === '\n') {
        line++
        lineStart = i
      }
      continue
    }

    // Scan a single argument
    while (i < n) {
      c = input[i]
      if (c === ' ' || c === '\t' || c === '\n') break
      i++

      // Handle unquoted backslashes
      if (c === '\\' && i < n) {
        c = input[i++]
        if (c === '\n') {
          line++
          lineStart = i
        } else {
          arg += c
        }
      }

      // Handle single quotes
      else if (c === '\'') {
        const openLine = line
        const openColumn = i - lineStart - 1
        while (true) {
          if (i === n) throwNoClosingQuoteError(input, '\'', openLine, openColumn, line, i - lineStart)
          c = input[i++]
          if (c === '\'') break
          if (c === '\\' && i < n && input[i] !== '\'') {
            c = input[i++]
            if (c === '\n') {
              line++
              lineStart = i
              continue
            }
          }
          if (c === '\n') {
            line++
            lineStart = i
          }
          arg += c
        }
      }

      // Handle double quotes
      else if (c === '"') {
        const openLine = line
        const openColumn = i - lineStart - 1
        while (true) {
          if (i === n) throwNoClosingQuoteError(input, '"', openLine, openColumn, line, i - lineStart)
          c = input[i++]
          if (c === '"') break
          if (c === '\\' && i < n) {
            c = input[i++]
            if (c === '\n') {
              line++
              lineStart = i
              continue
            }
          }
          if (c === '\n') {
            line++
            lineStart = i
          }
          arg += c
        }
      }

      // Handle other unquoted characters
      else {
        arg += c
      }
    }

    args.push({
      text_: arg,
      line_: argLine,
      column_: argColumn,
      length_: i - argStart,
    })
  }

  const entryPoints: (string | { in: string, out: string })[] = []
  const output: Record<string, any> = Object.create(null)

  const kebabCaseToCamelCase = (text: string, arg: Omit<Arg, 'text_'>): string => {
    if (text !== text.toLowerCase())
      throwRichError(input, 'Invalid CLI-style flag: ' + JSON.stringify('--' + text),
        arg.line_, arg.column_, text.length + 2)
    return text.replace(/-(\w)/g, (_, x) => x.toUpperCase())
  }

  // Convert CLI-style options to JS-style options
  for (const { text_: text, ...arg } of args) {
    const equals = text.indexOf('=')

    if (text.startsWith('--')) {
      const colon = text.indexOf(':')

      // Array element
      if (colon >= 0 && equals < 0) {
        const key = kebabCaseToCamelCase(text.slice(2, colon), arg)
        const value = text.slice(colon + 1)
        if (!(key in output) || !Array.isArray(output[key])) {
          output[key] = []
        }
        output[key].push(value)
      }

      // Map element
      else if (colon >= 0 && colon < equals) {
        const key1 = kebabCaseToCamelCase(text.slice(2, colon), arg)
        const key2 = text.slice(colon + 1, equals)
        const value = text.slice(equals + 1)
        if (!(key1 in output) || typeof output[key1] !== 'object' || Array.isArray(output[key1])) {
          output[key1] = Object.create(null)
        }
        output[key1][key2] = value
      }

      // Key value
      else if (equals >= 0) {
        const value = text.slice(equals + 1)
        output[kebabCaseToCamelCase(text.slice(2, equals), arg)] =
          value === 'true' ? true : value === 'false' ? false : value
      }

      // Bare boolean
      else {
        output[kebabCaseToCamelCase(text.slice(2), arg)] = true
      }
    }

    // Invalid flag
    else if (text.startsWith('-') || mode === Mode.Transform) {
      throwRichError(input, 'All CLI-style flags must start with "--"', arg.line_, arg.column_, arg.length_)
    }

    // Entry point
    else {
      // Assign now to set "entryPoints" here in the property iteration order
      output['entryPoints'] = entryPoints
      entryPoints.push(equals < 0 ? text : { in: text.slice(equals + 1), out: text.slice(0, equals) })
    }
  }

  if (entryPoints.length) output['entryPoints'] = entryPoints
  return output
}

function parseOptionsAsLooseJSON(input: string): Record<string, any> {
  const throwUnexpectedToken = (): never => {
    const what =
      token.kind_ === Kind.String ? 'string' :
        (token.kind_ === Kind.Identifier ? 'identifier ' : '') +
        JSON.stringify(token.text_)
    return throwRichError(input, `Unexpected ${what} in ${where}`, token.line_, token.column_, token.text_.length)
  }

  const throwExpectedAfter = (token: Token, expected: string, after: string): never => {
    return throwRichError(input, `Expected "${expected}" after ${after} in ${where}`,
      token.line_, token.column_ + token.text_.length, 0, '', 0, 0, 0, expected)
  }

  const nextToken = (flags = Flags.None): void => {
    while (i < n) {
      const tokenLine = line
      const tokenColumn = i - lineStart
      let c = input[i]

      // Newlines
      if (c === '\n') {
        line++
        lineStart = ++i
        continue
      }

      // Whitespace
      if (c === ' ' || c === '\t') {
        i++
        continue
      }

      if (c === '/') {
        const start = i++

        // Single-line comments
        if (i < n && input[i] === '/') {
          i++
          while (i < n && input[i] !== '\n') i++
          continue
        }

        // Multi-line comments
        if (i < n && input[i] === '*') {
          i++
          while (true) {
            if (i === n) {
              throwRichError(input,
                'Expected "*/" to terminate multi-line comment', line, i - lineStart, 0,
                'The multi-line comment starts here:', tokenLine, tokenColumn, 2, '*/')
            }
            c = input[i++]
            if (c === '\n') {
              line++
              lineStart = i
            } else if (c === '*' && i < n && input[i] === '/') {
              i++
              break
            }
          }
          continue
        }

        // RegExp
        let openBracket = 0
        while (true) {
          if (i === n || input[i] === '\n') {
            if (openBracket)
              throwRichError(input,
                'Expected "]" to terminate character class', line, i - lineStart, 0,
                'The character class starts here:', line, openBracket - lineStart, 1, ']')
            else
              throwRichError(input,
                'Expected "/" to terminate regular expression', line, i - lineStart, 0,
                'The regular expression starts here:', tokenLine, tokenColumn, 1, '/')
          }
          c = input[i++]
          if (c === '/' && !openBracket) break
          else if (c === ']' && openBracket) openBracket = 0
          else if (c === '[') openBracket = i - 1
          else if (c === '\\' && i < n && input[i] !== '\n') i++
        }
        while (i < n && /\w/.test(input[i])) i++ // Also scan over any trailing flags
        const text = input.slice(start, i)
        let value: any
        try {
          value = (0, eval)(text)
        } catch {
          throwRichError(input, `Invalid regular expression in ${where}`, tokenLine, tokenColumn, i - start)
        }
        token = { line_: tokenLine, column_: tokenColumn, kind_: Kind.Literal, text_: text, value_: value }
        return
      }

      // End of file
      if (flags & Flags.ExpectEndOfFile) {
        throwRichError(input, `Expected end of file after ${where}`, line, i - lineStart, 0)
      }

      // Punctuation
      const index = '-,:[]{}()+'.indexOf(c)
      if (index >= 0) {
        i++
        token = { line_: tokenLine, column_: tokenColumn, kind_: index as Kind, text_: c, value_: c }
        return
      }

      // Number
      if (c === '.' || (c >= '0' && c <= '9')) {
        const number = /^[\.\w]$/
        const start = i++
        while (i < n && number.test(input[i])) i++
        const text = input.slice(start, i)
        if (!/\d/.test(text)) {
          i = start // Undo if this was a "."
        } else {
          const value = +text
          if (value !== value) {
            throwRichError(input, `Invalid number "${text}" in ${where}`, tokenLine, tokenColumn, i - start)
          }
          token = { line_: tokenLine, column_: tokenColumn, kind_: Kind.Literal, text_: text, value_: value }
          return
        }
      }

      // Identifier
      const identifier = /^[\w\$]$/
      if (identifier.test(c)) {
        const start = i++
        while (i < n && identifier.test(input[i])) i++
        const text = input.slice(start, i)
        let kind = Kind.Literal
        let value: any = text
        if (flags & Flags.KeywordsAreIdentifiers) kind = Kind.Identifier
        else if (text === 'null') value = null
        else if (text === 'true') value = true
        else if (text === 'false') value = false
        else if (text === 'undefined') value = undefined
        else if (text === 'Infinity') value = Infinity
        else if (text === 'NaN') value = NaN
        else if (text === 'function') kind = Kind.Function
        else kind = Kind.Identifier
        token = { line_: tokenLine, column_: tokenColumn, kind_: kind, text_: text, value_: value }
        return
      }

      // String
      if (c === '"' || c === '\'') {
        const start = i++
        while (true) {
          if (i === n || input[i] === '\n') throwNoClosingQuoteError(input, c, tokenLine, tokenColumn, line, i - lineStart)
          if (input[i] === '\\' && i + 1 < n) {
            i += 2
            if (input[i - 1] === '\n') {
              line++
              lineStart = i
            }
          }
          else if (input[i++] === c) break
        }
        const text = input.slice(start, i)
        let value: any
        try {
          value = (0, eval)(text)
        } catch {
          throwRichError(input, `Invalid string in ${where}`, tokenLine, tokenColumn, i - start)
        }
        token = { line_: tokenLine, column_: tokenColumn, kind_: Kind.String, text_: text, value_: value }
        return
      }

      throwRichError(input, `Unexpected ${JSON.stringify(c)} in ${where}`, line, i - lineStart, 1)
    }

    if (!(flags & Flags.ExpectEndOfFile)) {
      throwRichError(input, `Unexpected end of file in ${where}`, line, i - lineStart, 0)
    }
  }

  // Hack: Parse function literals by repeatedly using the browser's parser after each '}' character
  const scanForFunctionLiteral = (name: string, from: number): Function => {
    let closeBrace = /\}/g
    let error = ''
    closeBrace.lastIndex = from

    for (let match: RegExpExecArray | null; match = closeBrace.exec(input);) {
      try {
        const code = new Function('return {' + name + input.slice(from, match.index + 1) + '}.' + name)
        i = match.index + 1
        return code()
      } catch (err) {
        error = ': ' + (err as Error).message
      }
    }

    throwRichError(input, 'Invalid function literal' + error, token.line_, token.column_, token.text_.length)
  }

  const parseExpression = (): any => {
    if (token.kind_ as number === Kind.OpenBrace) {
      const object: Record<string, any> = Object.create(null)
      const originals: Record<string, Token> = Object.create(null)
      while (true) {
        nextToken(Flags.KeywordsAreIdentifiers)
        if (token.kind_ === Kind.CloseBrace) break
        if (token.kind_ !== Kind.String && token.kind_ !== Kind.Identifier) throwUnexpectedToken()
        const original = originals[token.value_]
        if (original) {
          throwRichError(input, `Duplicate key ${JSON.stringify(token.value_)} in object literal`, token.line_, token.column_, token.text_.length,
            `The original key ${JSON.stringify(token.value_)} is here:`, original.line_, original.column_, original.text_.length)
        }
        const key = token
        const endOfKey = i
        let value: any
        nextToken()
        if (token.kind_ === Kind.OpenParen) value = scanForFunctionLiteral(key.value_, endOfKey)
        else {
          if (token.kind_ !== Kind.Colon) throwExpectedAfter(key, ':', 'property ' + JSON.stringify(key.value_))
          nextToken()
          if (token.kind_ === Kind.Function) value = scanForFunctionLiteral(key.value_, endOfKey)
          else value = parseExpression()
        }
        object[key.value_] = value
        originals[key.value_] = key
        const beforeComma = token
        nextToken()
        if (token.kind_ as number === Kind.CloseBrace) break
        if (token.kind_ !== Kind.Comma) throwExpectedAfter(beforeComma, ',', 'property ' + JSON.stringify(key.value_))
      }
      return object
    }

    if (token.kind_ as number === Kind.OpenBracket) {
      const array: any[] = []
      let element = 0
      while (true) {
        nextToken()
        if (token.kind_ === Kind.CloseBracket) break
        if (token.kind_ as number !== Kind.Comma) {
          array[element++] = parseExpression()
          const beforeComma = token
          nextToken()
          if (token.kind_ as number === Kind.CloseBracket) break
          if (token.kind_ !== Kind.Comma) throwExpectedAfter(beforeComma, ',', 'array element')
        } else {
          array.length = ++element
        }
      }
      return array
    }

    if (token.kind_ === Kind.Literal || token.kind_ === Kind.String) return token.value_
    if (token.kind_ === Kind.Plus) return nextToken(), +parseExpression()
    if (token.kind_ === Kind.Minus) return nextToken(), -parseExpression()
    return throwUnexpectedToken()
  }

  // This is not really JSON5 because it supports regular expressions too, but
  // saying it's JSON5 is likely the most concise way to communicate the format
  const where = 'JSON5 value'
  const n = input.length
  let line = 0
  let lineStart = 0
  let i = 0
  let token: Token

  nextToken()
  const root = parseExpression()
  nextToken(Flags.ExpectEndOfFile)
  return root
}

function throwRichError(
  input: string,
  text: string, line: number, column: number, length: number,
  noteText = '', noteLine = 0, noteColumn = 0, noteLength = 0,
  suggestion?: string,
): never {
  const lines = input.split('\n')
  const err = new Error(text) as RichError
  err.location_ = {
    file_: '<options>',
    line_: line + 1,
    column_: column,
    length_: length,
    lineText_: lines[line],
    suggestion_: suggestion,
  }
  if (noteText) {
    err.notes_ = [{
      text_: noteText,
      location_: {
        file_: '<options>',
        line_: noteLine + 1,
        column_: noteColumn,
        length_: noteLength,
        lineText_: lines[noteLine],
      },
    }]
  }
  throw err
}

function throwNoClosingQuoteError(
  input: string, quote: string,
  openLine: number, openColumn: number,
  closeLine: number, closeColumn: number,
): never {
  const kind = quote === '"' ? 'double' : 'single'
  throwRichError(input,
    `Failed to find the closing ${kind} quote`, closeLine, closeColumn, 0,
    `The opening ${kind} quote is here:`, openLine, openColumn, 1, quote)
}

export function printOptionsAsShellArgs(options: Record<string, any>): string {
  const quoteForShell = (text: string): string => {
    if (!/[ \t\n\\'"]/.test(text)) return text
    return '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }

  const camelCaseToKabobCase = (text: string): string => {
    return text.replace(/[A-Z]/g, x => '-' + x.toLowerCase())
  }

  const args: string[] = []

  for (const key in options) {
    const kabobKey = camelCaseToKabobCase(key)
    const it = options[key]
    const type = typeof it

    if (type === 'string' || type === 'boolean' || type === 'number' || it === null) {
      args.push(it === true ? '--' + kabobKey : `--${kabobKey}=${it}`)
    }

    else if (Array.isArray(it)) {
      if (commaSeparatedArrays.includes(key)) {
        args.push(`--${kabobKey}=${it}`)
      } else {
        for (const x of it) {
          args.push(
            key === 'entryPoints' ? typeof x === 'object' && x !== null && typeof x.in === 'string' && typeof x.out === 'string' ? `${x.out}=${x.in}` : x :
              `--${kabobKey}:${x}`)
        }
      }
    }

    else if (it instanceof RegExp) {
      args.push(`--${kabobKey}=${it.source}`)
    }

    else if (key === 'tsconfigRaw') {
      args.push(`--${kabobKey}=${JSON.stringify(it)}`)
    }

    else if (type === 'object' && key !== 'mangleCache' && key !== 'stdin') {
      for (const prop in it) {
        args.push(`--${kabobKey}:${prop}=${it[prop]}`)
      }
    }

    else {
      throw new Error('Not representable')
    }
  }

  return args.map(quoteForShell).join(' ')
}

export function printOptionsAsLooseJSON(options: Record<string, any>): string {
  const printForJSON5 = (it: any, indent: string, allowNewline = true): string => {
    const type = typeof it

    if (type === 'string') {
      const text = it.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
      const single = text.split('\'')
      const double = text.split('"')
      return double.length < single.length ? '"' + double.join('\\"') + '"' : '\'' + single.join("\\'") + '\''
    }

    if (type === 'boolean' || type === 'number' || it instanceof RegExp) {
      return it + ''
    }

    const nextIndent = indent + '  '
    if (Array.isArray(it)) {
      // Format "entryPoints" on one line unless the extended "{ in, out }"
      // syntax is used. And in that case, format on multiple lines but format
      // each "{ in, out }" object on one line.
      const oneLine = it.every(x => typeof x === 'string')
      let result = '['
      for (const value of it) {
        result += result === '[' ? oneLine ? '' : '\n' + nextIndent : oneLine ? ', ' : nextIndent
        result += printForJSON5(value, nextIndent, false)
        if (!oneLine) result += ',\n'
      }
      if (result !== '[' && !oneLine) result += indent
      return result + ']'
    }

    let result = '{'
    for (const key in it) {
      const value = it[key]
      result += result === '{' ? allowNewline ? '\n' + nextIndent : ' ' : allowNewline ? nextIndent : ', '
      result += `${/^[A-Za-z$_][A-Za-z0-9$_]*$/.test(key) ? key : printForJSON5(key, '')}: ${printForJSON5(value, nextIndent)}`
      if (allowNewline) result += ',\n'
    }
    if (result !== '{') result += allowNewline ? indent : ' '
    return result + '}'
  }

  return printForJSON5(options, '')
}
