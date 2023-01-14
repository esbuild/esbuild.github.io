import './index.css'
import './import'
import './live-reload'
import { Metafile, metafileHasFormat } from './metafile'
import { showSummary } from './summary'
import { createSunburst } from './sunburst'
import { createFlame } from './flame'
import { hideWhyFile } from './whyfile'
import { showWarningsPanel } from './warnings'
import { COLOR, updateColorMapping } from './color'
import {
  darkModeListener,
  localStorageGetItem,
  localStorageSetItem,
} from './helpers'

enum CHART {
  NONE = 0,
  SUNBURST = 1,
  FLAME = 2,
}

let startPanel = document.getElementById('startPanel') as HTMLDivElement
let resultsPanel = document.getElementById('resultsPanel') as HTMLDivElement
let chartPanel = document.getElementById('chartPanel') as HTMLDivElement
let useSunburst = document.getElementById('useSunburst') as HTMLAnchorElement
let useFlame = document.getElementById('useFlame') as HTMLAnchorElement
let chartMode = CHART.NONE
export let colorMode = COLOR.NONE

let isPlainObject = (value: any): boolean => {
  return typeof value === 'object' && value !== null && !(value instanceof Array)
}

export let finishLoading = (json: string): void => {
  let metafile: Metafile = JSON.parse(json)
  let hasFormat = metafileHasFormat(metafile)

  let useChart = (use: CHART): void => {
    if (chartMode !== use) {
      if (chartMode === CHART.SUNBURST) useSunburst.classList.remove('active')
      else if (chartMode === CHART.FLAME) useFlame.classList.remove('active')

      chartMode = use
      chartPanel.innerHTML = ''

      if (chartMode === CHART.SUNBURST) {
        chartPanel.appendChild(createSunburst(metafile))
        useSunburst.classList.add('active')
        localStorageSetItem('chart', 'sunburst')
      } else if (chartMode === CHART.FLAME) {
        chartPanel.appendChild(createFlame(metafile))
        useFlame.classList.add('active')
        localStorageSetItem('chart', 'flame')
      }
    }
  }

  let useColor = (use: COLOR): void => {
    if (colorMode !== use) {
      colorMode = use
      updateColorMapping(metafile, colorMode)
    }
  }

  if (!isPlainObject(metafile) || !isPlainObject(metafile.inputs) || !isPlainObject(metafile.outputs)) {
    throw new Error('Invalid metafile format')
  }

  startPanel.style.display = 'none'
  resultsPanel.style.display = 'block'
  useSunburst.onclick = () => useChart(CHART.SUNBURST)
  useFlame.onclick = () => useChart(CHART.FLAME)

  chartMode = CHART.NONE
  colorMode = COLOR.NONE
  showSummary(metafile, () => useColor(colorMode === COLOR.DIRECTORY ? COLOR.FORMAT : COLOR.DIRECTORY))
  showWarningsPanel(metafile)
  hideWhyFile()
  useChart(localStorageGetItem('chart') === 'flame' ? CHART.FLAME : CHART.SUNBURST)
  useColor(COLOR.DIRECTORY)
}

let bodyDataset = document.body.dataset
let updateTheme = () => {
  // Keep the dark/light mode theme up to date with the rest of the site
  bodyDataset.theme = localStorageGetItem('theme') + ''
  if (darkModeListener) darkModeListener()
}

updateTheme()
window.addEventListener('storage', updateTheme)

document.getElementById('loadExample')!.onclick = () => {
  fetch('example-metafile.json').then(r => r.text()).then(finishLoading)
}
