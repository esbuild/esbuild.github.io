export interface Metafile {
  inputs: Record<string, InputFile>
  outputs: Record<string, OutputFile>
}

export interface InputFile {
  bytes: number
  imports: ImportRecord[]
  format?: 'cjs' | 'esm'
}

export interface OutputFile {
  bytes: number
  inputs: Record<string, InputForOutput>
  imports: ImportRecord[]
  exports: string[]
  entryPoint?: string
  cssBundle?: string
}

export interface ImportRecord {
  path: string
  kind: string
  external?: boolean
  original?: string
}

export interface InputForOutput {
  bytesInOutput: number
}

export let metafileHasFormat = (metafile: Metafile): boolean => {
  let inputs = metafile.inputs
  for (let file in inputs) {
    if (inputs[file].format) {
      return true
    }
  }
  return false
}
