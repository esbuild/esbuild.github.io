import './summary.css'
import { Metafile } from './metafile'
import {
  bytesToText,
  formatInteger,
  isSourceMapPath,
  textToHTML,
} from './helpers'

let summaryPanel = document.getElementById('summaryPanel') as HTMLDivElement

export let showSummary = (metafile: Metafile): void => {
  let inputs = metafile.inputs
  let outputs = metafile.outputs
  let fileCountIn = 0
  let fileCountOut = 0
  let totalBytesIn = 0
  let totalBytesOut = 0

  for (let file in inputs) {
    fileCountIn++
    totalBytesIn += inputs[file].bytes
  }

  for (let file in outputs) {
    if (!isSourceMapPath(file)) {
      fileCountOut++
      totalBytesOut += outputs[file].bytes
    }
  }

  summaryPanel.innerHTML = ''
    + '<table><tr>'

    + '<td>'
    + '<h2>' + textToHTML(bytesToText(totalBytesIn)) + '</h2>'
    + textToHTML(formatInteger(fileCountIn)) + ' input ' + (fileCountIn === 1 ? 'file' : 'files')
    + '</td>'

    + '<td class="symbol">&rarr;</td>'

    + '<td>'
    + '<h2>' + textToHTML(bytesToText(totalBytesOut)) + '</h2>'
    + textToHTML(formatInteger(fileCountOut)) + ' output ' + (fileCountOut === 1 ? 'file' : 'files')
    + '</td>'

    + '</tr></table>'
}
