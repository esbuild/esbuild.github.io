import './index.css'
import './import'
import { Metafile } from './metafile'
import { showSummary } from './summary'
import { createSunburst } from './sunburst'
import { createFlame } from './flame'
import { hideWhyFile } from './whyfile'
import { showWarningsPanel } from './warnings'
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
let chart = CHART.NONE

let isPlainObject = (value: any): boolean => {
  return typeof value === 'object' && value !== null && !(value instanceof Array)
}

export let finishLoading = (json: string): void => {
  let metafile: Metafile = JSON.parse(json)

  let useChart = (use: CHART): void => {
    if (chart !== use) {
      if (chart === CHART.SUNBURST) useSunburst.classList.remove('active')
      else if (chart === CHART.FLAME) useFlame.classList.remove('active')

      chart = use
      chartPanel.innerHTML = ''

      if (chart === CHART.SUNBURST) {
        chartPanel.appendChild(createSunburst(metafile))
        useSunburst.classList.add('active')
        localStorageSetItem('chart', 'sunburst')
      } else if (chart === CHART.FLAME) {
        chartPanel.appendChild(createFlame(metafile))
        useFlame.classList.add('active')
        localStorageSetItem('chart', 'flame')
      }
    }
  }

  if (!isPlainObject(metafile) || !isPlainObject(metafile.inputs) || !isPlainObject(metafile.outputs)) {
    throw new Error('Invalid metafile format')
  }

  startPanel.style.display = 'none'
  resultsPanel.style.display = 'block'
  useSunburst.onclick = () => useChart(CHART.SUNBURST)
  useFlame.onclick = () => useChart(CHART.FLAME)

  chart = CHART.NONE
  showSummary(metafile)
  showWarningsPanel(metafile)
  hideWhyFile()
  useChart(localStorageGetItem('chart') === 'flame' ? CHART.FLAME : CHART.SUNBURST)
}

let loadFromHash = () => {
  try {
    let json = atob(location.hash.slice(1))
    finishLoading(json)
  } catch (e) {
    // Clear out invalid hash
    if (location.hash !== '') {
      try {
        history.replaceState({}, '', location.pathname);
      } catch (e) {}
    }
  }
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

if (location.hash) loadFromHash()
