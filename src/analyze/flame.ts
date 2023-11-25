import * as indexStyles from './index.css'
import * as styles from './flame.css'
import { Metafile } from './metafile'
import { isWhyFileVisible, showWhyFile } from './whyfile'
import { accumulatePath, orderChildrenBySize, TreeNodeInProgress } from './tree'
import { colorMode } from './index'
import {
  canvasFillStyleForInputPath,
  COLOR,
  colorLegendEl,
  cssBackgroundForInputPath,
  moduleTypeLabelInputPath,
  otherColor,
  setAfterColorMappingUpdate,
} from './color'
import {
  bytesToText,
  commonPrefixFinder,
  isMac,
  isSourceMapPath,
  now,
  setDarkModeListener,
  setResizeEventListener,
  setWheelEventListener,
  shortenDataURLForDisplay,
  splitPathBySlash,
  stripDisabledPathPrefix,
  strokeRectWithFirefoxBugWorkaround,
  textToHTML,
} from './helpers'

enum CONSTANTS {
  MARGIN = 50,
  ROW_HEIGHT = 24,
  TEXT_INDENT = 5,
  DOT_CHAR_CODE = 46,
  ZOOMED_OUT_WIDTH = 1000,
}

enum FLAGS {
  OUTPUT = 1,
  HOVER = 2,
}

interface TreeNode {
  name_: string
  inputPath_: string
  sizeText_: string
  bytesInOutput_: number
  sortedChildren_: TreeNode[]
}

interface Tree {
  root_: TreeNode
  maxDepth_: number
}

let analyzeDirectoryTree = (metafile: Metafile): Tree => {
  let outputs = metafile.outputs
  let totalBytes = 0
  let maxDepth = 0
  let nodes: TreeNode[] = []
  let commonPrefix: string[] | undefined

  let sizeText = (bytesInOutput: number): string => {
    return ' – ' + bytesToText(bytesInOutput)
  }

  let sortChildren = (node: TreeNodeInProgress): TreeNode => {
    let children = node.children_
    let sorted: TreeNode[] = []
    for (let file in children) {
      sorted.push(sortChildren(children[file]))
    }
    return {
      name_: node.name_,
      inputPath_: node.inputPath_,
      sizeText_: sizeText(node.bytesInOutput_),
      bytesInOutput_: node.bytesInOutput_,
      sortedChildren_: sorted.sort(orderChildrenBySize),
    }
  }

  for (let o in outputs) {
    // Find the common directory prefix, not including the file name
    let parts = splitPathBySlash(o)
    parts.pop()
    commonPrefix = commonPrefixFinder(parts.join('/'), commonPrefix)
  }

  for (let o in outputs) {
    if (isSourceMapPath(o)) continue

    let name = commonPrefix ? splitPathBySlash(o).slice(commonPrefix.length).join('/') : o
    let node: TreeNodeInProgress = { name_: name, inputPath_: '', bytesInOutput_: 0, children_: {} }
    let output = outputs[o]
    let inputs = output.inputs
    let bytes = output.bytes

    // Accumulate the input files that contributed to this output file
    for (let i in inputs) {
      let depth = accumulatePath(node, stripDisabledPathPrefix(i), inputs[i].bytesInOutput)
      if (depth > maxDepth) maxDepth = depth
    }

    node.bytesInOutput_ = bytes
    totalBytes += bytes
    nodes.push(sortChildren(node))
  }

  // Unwrap common nested directories
  stop: while (true) {
    let prefix: string | undefined
    for (let node of nodes) {
      let children = node.sortedChildren_
      if (!children.length) continue
      if (children.length > 1 || children[0].sortedChildren_.length !== 1) break stop
      let name = children[0].name_
      if (prefix === undefined) prefix = name
      else if (prefix !== name) break stop
    }
    if (prefix === undefined) break

    // Remove one level
    for (let node of nodes) {
      let children = node.sortedChildren_
      if (children.length) {
        children = children[0].sortedChildren_
        for (let child of children) child.name_ = prefix + child.name_
        node.sortedChildren_ = children
      }
    }
    maxDepth--
  }

  // Add entries for the remaining space in each chunk
  for (let node of nodes) {
    let childBytes = 0
    for (let child of node.sortedChildren_) {
      childBytes += child.bytesInOutput_
    }
    if (childBytes < node.bytesInOutput_) {
      node.sortedChildren_.push({
        name_: '(unassigned)',
        inputPath_: '',
        sizeText_: sizeText(node.bytesInOutput_ - childBytes),
        bytesInOutput_: node.bytesInOutput_ - childBytes,
        sortedChildren_: [],
      })
    }
  }

  nodes.sort(orderChildrenBySize)
  return {
    root_: {
      name_: '',
      inputPath_: '',
      sizeText_: '',
      bytesInOutput_: totalBytes,
      sortedChildren_: nodes,
    },
    maxDepth_: maxDepth + 1,
  }
}

export let createFlame = (metafile: Metafile): HTMLDivElement => {
  let tree = analyzeDirectoryTree(metafile)
  let totalBytes = tree.root_.bytesInOutput_
  let viewportMin = 0
  let viewportMax = totalBytes
  let componentEl = document.createElement('div')
  let mainEl = document.createElement('main')
  let canvas = document.createElement('canvas')
  let c = canvas.getContext('2d')!
  let width = 0
  let height = 0
  let zoomedOutMin = 0
  let zoomedOutWidth = 0
  let prevWheelTime = 0
  let prevWheelWasZoom = false
  let stripeScaleAdjust = 1
  let animationFrame: number | null = null
  let hoveredNode: TreeNode | null = null
  let fgOnColor = ''
  let normalFont = '14px sans-serif', boldWidthCache: Record<number, number> = {}
  let boldFont = 'bold ' + normalFont, normalWidthCache: Record<number, number> = {}
  let ellipsisWidth = 0
  let currentWidthCache: Record<number, number> = normalWidthCache

  let changeHoveredNode = (node: TreeNode | null): void => {
    if (hoveredNode !== node) {
      hoveredNode = node
      canvas.style.cursor = node && !node.sortedChildren_.length ? 'pointer' : 'auto'
      if (!node) hideTooltip()
      invalidate()
    }
  }

  let charCodeWidth = (ch: number): number => {
    let width = currentWidthCache[ch]
    if (width === undefined) {
      width = c.measureText(String.fromCharCode(ch)).width
      currentWidthCache[ch] = width
    }
    return width
  }

  let resize = (): void => {
    let ratio = window.devicePixelRatio || 1
    width = componentEl.clientWidth + 2 * CONSTANTS.MARGIN
    height = tree.maxDepth_ * CONSTANTS.ROW_HEIGHT + 1
    zoomedOutMin = (width - CONSTANTS.ZOOMED_OUT_WIDTH) >> 1
    zoomedOutWidth = zoomedOutMin + CONSTANTS.ZOOMED_OUT_WIDTH
    if (zoomedOutMin < 0) zoomedOutMin = 0
    if (zoomedOutWidth > width) zoomedOutWidth = width
    zoomedOutWidth -= zoomedOutMin
    stripeScaleAdjust = totalBytes / zoomedOutWidth
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    mainEl.style.height = height + 'px'
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    c.scale(ratio, ratio)
    draw()
  }

  let textOverflowEllipsis = (text: string, width: number): string => {
    let textWidth = ellipsisWidth
    let n = text.length
    let i = 0
    while (i < n) {
      textWidth += charCodeWidth(text.charCodeAt(i))
      if (textWidth > width) break
      i++
    }
    return text.slice(0, i) + '...'
  }

  // We want to avoid overlapping strokes from lots of really small adjacent
  // rectangles all merging together into a solid color. So we enforce a
  // minimum rectangle width of 2px and we also skip drawing rectangles that
  // have a right edge less than 1.5px from the previous right edge.
  let drawNode = (node: TreeNode, y: number, startBytes: number, prevRightEdge: number, flags: FLAGS): number => {
    let scale = zoomedOutWidth / (viewportMax - viewportMin)
    let x = zoomedOutMin + (startBytes - viewportMin) * scale
    let w = node.bytesInOutput_ * scale
    let rightEdge = x + w
    if (rightEdge < prevRightEdge + 1.5) return prevRightEdge
    if (x + w < 0 || x > width) return rightEdge

    let rectWidth = w < 2 ? 2 : w
    let textX = (x > 0 ? x : 0) + CONSTANTS.TEXT_INDENT
    let textY = y + CONSTANTS.ROW_HEIGHT / 2
    let nameText = ''
    let sizeText = ''
    let measuredW: number
    let typesetX = 0
    let typesetW = w + x - textX
    let fillColor = node.inputPath_
      ? canvasFillStyleForInputPath(c, node.inputPath_,
        zoomedOutMin - viewportMin * scale, CONSTANTS.ROW_HEIGHT, scale * stripeScaleAdjust)
      : otherColor
    let textColor = 'black'
    let childRightEdge = -Infinity

    if (flags & FLAGS.OUTPUT) {
      textColor = fgOnColor
      c.font = boldFont
      currentWidthCache = boldWidthCache
      ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
    } else {
      c.fillStyle = fillColor
      c.fillRect(x, y, rectWidth, CONSTANTS.ROW_HEIGHT)

      // Draw the hover highlight
      if ((flags & FLAGS.HOVER) || (hoveredNode && node.inputPath_ === hoveredNode.inputPath_)) {
        c.fillStyle = 'rgba(255, 255, 255, 0.3)'
        c.fillRect(x, y, rectWidth, CONSTANTS.ROW_HEIGHT)
        flags |= FLAGS.HOVER
      }
    }

    // Typeset the node name
    if (ellipsisWidth < typesetW) {
      nameText = node.name_
      measuredW = c.measureText(nameText).width
      if (measuredW <= typesetW) {
        typesetX += measuredW
      } else {
        nameText = textOverflowEllipsis(nameText, typesetW)
        typesetX = typesetW
      }
      c.fillStyle = textColor
      c.fillText(nameText, textX, textY)
    }

    // Switch to the size font
    if (flags & FLAGS.OUTPUT) {
      c.font = normalFont
      currentWidthCache = normalWidthCache
      ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
    }

    // Typeset the node size
    if (typesetX + ellipsisWidth < typesetW) {
      sizeText = colorMode === COLOR.FORMAT ? moduleTypeLabelInputPath(node.inputPath_, ' – ') : node.sizeText_
      measuredW = c.measureText(sizeText).width
      if (typesetX + measuredW > typesetW) {
        sizeText = textOverflowEllipsis(sizeText, typesetW - typesetX)
      }
      c.globalAlpha = 0.5
      c.fillText(sizeText, textX + typesetX, textY)
      c.globalAlpha = 1
    }

    // Draw the children
    for (let child of node.sortedChildren_) {
      childRightEdge = drawNode(child, y + CONSTANTS.ROW_HEIGHT, startBytes, childRightEdge, flags & ~FLAGS.OUTPUT)
      startBytes += child.bytesInOutput_
    }

    // Draw the outline
    if (!(flags & FLAGS.OUTPUT)) {
      // Note: The stroke deliberately overlaps the right and bottom edges
      strokeRectWithFirefoxBugWorkaround(c, '#222', x + 0.5, y + 0.5, rectWidth, CONSTANTS.ROW_HEIGHT)
    }

    return rightEdge
  }

  let draw = (): void => {
    let bodyStyle = getComputedStyle(document.body)
    let startBytes = 0
    let rightEdge = -Infinity

    animationFrame = null
    fgOnColor = bodyStyle.getPropertyValue('--fg-on')
    c.clearRect(0, 0, width, height)
    c.textBaseline = 'middle'

    for (let child of tree.root_.sortedChildren_) {
      rightEdge = drawNode(child, 0, startBytes, rightEdge, FLAGS.OUTPUT)
      startBytes += child.bytesInOutput_
    }
  }

  let invalidate = (): void => {
    if (animationFrame === null) animationFrame = requestAnimationFrame(draw)
  }

  let tooltipEl = document.createElement('div')

  let showTooltip = (x: number, y: number, html: string): void => {
    tooltipEl.style.display = 'block'
    tooltipEl.style.left = x + 'px'
    tooltipEl.style.top = y + 'px'
    tooltipEl.innerHTML = html

    let right = tooltipEl.offsetWidth
    for (let el: HTMLElement | null = tooltipEl; el; el = el.offsetParent as HTMLElement | null) {
      right += el.offsetLeft
    }

    if (right > width) {
      tooltipEl.style.left = x + width - right + 'px'
    }
  }

  let hideTooltip = (): void => {
    tooltipEl.style.display = 'none'
  }

  let hitTestNode = (mouseEvent: MouseEvent | WheelEvent): TreeNode | null => {
    let visit = (node: TreeNode, y: number, startBytes: number): TreeNode | null => {
      if (mouseBytes >= startBytes && mouseBytes < startBytes + node.bytesInOutput_) {
        if (mouseY >= y && mouseY < y + CONSTANTS.ROW_HEIGHT && node.inputPath_) {
          return node
        }

        if (mouseY >= y + CONSTANTS.ROW_HEIGHT) {
          for (let child of node.sortedChildren_) {
            let result = visit(child, y + CONSTANTS.ROW_HEIGHT, startBytes)
            if (result) return result
            startBytes += child.bytesInOutput_
          }
        }
      }
      return null
    }

    let mouseX = mouseEvent.pageX
    let mouseY = mouseEvent.pageY
    for (let el: HTMLElement | null = canvas; el; el = el.offsetParent as HTMLElement | null) {
      mouseX -= el.offsetLeft
      mouseY -= el.offsetTop
    }

    let mouseBytes = viewportMin + (viewportMax - viewportMin) / zoomedOutWidth * (mouseX - zoomedOutMin)
    let startBytes = 0

    for (let child of tree.root_.sortedChildren_) {
      let result = visit(child, 0, startBytes)
      if (result) return result
      startBytes += child.bytesInOutput_
    }

    return null
  }

  let modifyViewport = (deltaX: number, deltaY: number, xForZoom: number | null): void => {
    let min = viewportMin
    let max = viewportMax
    let translate = 0

    if (xForZoom !== null) {
      let mouse = min + (max - min) / zoomedOutWidth * (xForZoom - zoomedOutMin)
      let scale = Math.pow(1.01, deltaY)
      min = mouse + (min - mouse) * scale
      max = mouse + (max - mouse) * scale
    } else {
      translate = deltaX * (max - min) / zoomedOutWidth
    }

    if (min + translate < 0) translate = -min
    else if (max + translate > totalBytes) translate = totalBytes - max
    min += translate
    max += translate

    if (min < 0) min = 0
    if (max > totalBytes) max = totalBytes

    if (viewportMin !== min || viewportMax !== max) {
      viewportMin = min
      viewportMax = max
      invalidate()
    }
  }

  let updateHover = (e: MouseEvent | WheelEvent): void => {
    let node = hitTestNode(e)
    changeHoveredNode(node)

    // Show a tooltip for hovered nodes
    if (node) {
      let tooltip = node.name_ === node.inputPath_ ? shortenDataURLForDisplay(node.inputPath_) : node.inputPath_
      let nameSplit = tooltip.length - node.name_.length
      tooltip = textToHTML(tooltip.slice(0, nameSplit)) + '<b>' + textToHTML(tooltip.slice(nameSplit)) + '</b>'
      tooltip += colorMode === COLOR.FORMAT
        ? textToHTML(moduleTypeLabelInputPath(node.inputPath_, ' – '))
        : ' – ' + textToHTML(bytesToText(node.bytesInOutput_))
      showTooltip(e.pageX, e.pageY + 20, tooltip)
    } else {
      hideTooltip()
    }
  }

  let didDrag = false

  canvas.onmousedown = e => {
    didDrag = false

    if (e.button !== 2) {
      let oldX = e.pageX

      let move = (e: MouseEvent): void => {
        let deltaX = e.pageX - oldX
        if (!didDrag && Math.abs(deltaX) < 3) return
        didDrag = true
        modifyViewport(-deltaX, 0, null)
        oldX = e.pageX
      }

      let up = (): void => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }

      e.preventDefault()
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    }
  }

  canvas.onmousemove = e => {
    updateHover(e)
  }

  canvas.onmouseout = e => {
    changeHoveredNode(null)
  }

  canvas.onclick = e => {
    // Don't trigger on mouse up after a drag
    if (didDrag) return

    let node = hitTestNode(e)
    changeHoveredNode(node)

    if (node && !node.sortedChildren_.length) {
      showWhyFile(metafile, node.inputPath_, node.bytesInOutput_)
    }
  }

  setWheelEventListener(e => {
    if (isWhyFileVisible()) return

    // This compares with the time of the previous zoom to implement "zoom
    // locking" to prevent zoom from changing to scroll if you zoom by
    // flicking on the touchpad with a key pressed but release the key while
    // momentum scrolling is still generating input events.
    let deltaX = e.deltaX
    let deltaY = e.deltaY
    let wheelTime = now()
    let isZoom = wheelTime - prevWheelTime < 50 ? prevWheelWasZoom : e.ctrlKey || e.metaKey
    prevWheelTime = wheelTime
    prevWheelWasZoom = isZoom

    // If we're zooming or panning sideways, then don't let the user interact
    // with the page itself. Note that this has to be ">=" not ">" for Chrome.
    if (isZoom || Math.abs(deltaX) >= Math.abs(deltaY)) {
      e.preventDefault()
    }

    modifyViewport(deltaX, deltaY, isZoom ? e.pageX : null)
    updateHover(e)
  })

  resize()
  Promise.resolve().then(resize) // Resize once the element is in the DOM
  setDarkModeListener(draw)
  setAfterColorMappingUpdate(draw)
  setResizeEventListener(resize)

  componentEl.id = styles.flamePanel
  componentEl.innerHTML = ''
    + `<div class="${indexStyles.summary}">`
    + '<p>'
    + 'This visualization shows which input files were placed into each output file in the bundle. '
    + 'Use the scroll wheel with the ' + (isMac ? 'command' : 'control') + ' key to zoom in and out.'
    + '</p>'
    + '<p>'
    + '<b>Benefit of this chart type:</b> Best chart for quick mouse navigation.'
    + '</p>'
    + '</div>'

  tooltipEl.className = indexStyles.tooltip
  mainEl.append(canvas)
  componentEl.append(mainEl, tooltipEl)

  let sectionEl = document.createElement('section')
  sectionEl.append(colorLegendEl)
  componentEl.append(sectionEl)
  return componentEl
}
