declare module '*.css' {
  let styles: Record<string, string> & { default: Record<string, string> }
  export = styles
}
