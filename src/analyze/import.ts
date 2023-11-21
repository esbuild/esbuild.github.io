import './import.css'
import { finishLoading } from './index'
import { indexOf } from './helpers'

let dragTarget = document.getElementById('dragTarget') as HTMLDivElement
let importButton = document.getElementById('importButton') as HTMLButtonElement
let dragging = 0
let importInput: HTMLInputElement | undefined

let isFilesDragEvent = (e: DragEvent, dt = e.dataTransfer): boolean | null => {
  return dt && dt.types && indexOf.call(dt.types, 'Files') !== -1
}

let startLoading = (files: FileList): void => {
  if (files.length === 1) {
    let reader = new FileReader()
    reader.onload = () => finishLoading(reader.result as string)
    reader.readAsText(files[0])
  }
}

document.ondragover = e => {
  e.preventDefault()
}

document.ondragenter = e => {
  e.preventDefault()
  if (!isFilesDragEvent(e)) return
  dragTarget.style.display = 'block'
  dragging++
}

document.ondragleave = e => {
  e.preventDefault()
  if (!isFilesDragEvent(e)) return
  if (--dragging === 0) dragTarget.style.display = 'none'
}

document.ondrop = e => {
  e.preventDefault()
  dragTarget.style.display = 'none'
  dragging = 0
  if (e.dataTransfer && e.dataTransfer.files) startLoading(e.dataTransfer.files)
}

importButton.onclick = function () {
  if (importInput) document.body.removeChild(importInput)
  let input = document.createElement('input')
  input.type = 'file'
  input.style.display = 'none'
  document.body.append(input)
  importInput = input
  input.click()
  input.onchange = () => input.files && startLoading(input.files)
}

document.body.addEventListener('paste', e => {
  if (e.clipboardData) {
    e.preventDefault()
    finishLoading(e.clipboardData.getData('text/plain'))
  }
})
