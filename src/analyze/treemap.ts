import * as indexStyles from './index.css'
import * as styles from './treemap.css'
import { Metafile } from './metafile'
import { TreeNodeInProgress, accumulatePath, orderChildrenBySize } from './tree'
import { isWhyFileVisible, showWhyFile } from './whyfile'
import { colorMode } from './index'
import {
  COLOR,
  canvasFillStyleForInputPath,
  colorLegendEl,
  cssBackgroundForInputPath,
  moduleTypeLabelInputPath,
  setAfterColorMappingUpdate,
} from './color'
import {
  bytesToText,
  commonPrefixFinder,
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

interface TreeNode {
  name_: string
  inputPath_: string
  sizeText_: string
  bytesInOutput_: number
  sortedChildren_: TreeNode[]
  isOutputFile_: boolean
}

interface Tree {
  root_: TreeNode
  maxDepth_: number
}

enum CONSTANTS {
  PADDING = 4,
  HEADER_HEIGHT = 20,
  DOT_CHAR_CODE = 46,
  ANIMATION_DURATION = 350,
  INSET_X = 2 * PADDING,
  INSET_Y = HEADER_HEIGHT + PADDING,
}

enum DrawFlags {
  CONTAINS_HOVER = 1,
  CONTAINS_TARGET = 2,
}

enum Culling {
  Disabled,
  Enabled,
  Culled
}

let analyzeDirectoryTree = (metafile: Metafile): Tree => {
  let outputs = metafile.outputs
  let totalBytes = 0
  let maxDepth = 0
  let nodes: TreeNode[] = []
  let commonPrefix: string[] | undefined

  let sortChildren = (node: TreeNodeInProgress, isOutputFile: boolean): TreeNode => {
    let children = node.children_
    let sorted: TreeNode[] = []
    for (let file in children) {
      sorted.push(sortChildren(children[file], false))
    }
    return {
      name_: node.name_,
      inputPath_: node.inputPath_,
      sizeText_: bytesToText(node.bytesInOutput_),
      bytesInOutput_: node.bytesInOutput_,
      sortedChildren_: sorted.sort(orderChildrenBySize),
      isOutputFile_: isOutputFile,
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
    nodes.push(sortChildren(node, true))
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
        sizeText_: bytesToText(node.bytesInOutput_ - childBytes),
        bytesInOutput_: node.bytesInOutput_ - childBytes,
        sortedChildren_: [],
        isOutputFile_: false,
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
      isOutputFile_: false,
    },
    maxDepth_: maxDepth + 1,
  }
}

interface NodeLayout {
  node_: TreeNode
  box_: [x: number, y: number, w: number, h: number]
  children_: NodeLayout[]
}

// "Squarified Treemaps": https://www.win.tue.nl/~vanwijk/stm.pdf
let layoutTreemap = (sortedChildren: TreeNode[], x: number, y: number, w: number, h: number): NodeLayout[] => {
  let children: NodeLayout[] = []

  let worst = (start: number, end: number, shortestSide: number, totalArea: number, bytesToArea: number): number => {
    let maxArea = sortedChildren[start].bytesInOutput_ * bytesToArea
    let minArea = sortedChildren[end].bytesInOutput_ * bytesToArea
    return Math.max(
      (shortestSide * shortestSide * maxArea) / (totalArea * totalArea),
      totalArea * totalArea / (shortestSide * shortestSide * minArea),
    )
  }

  let squarify = (start: number, x: number, y: number, w: number, h: number): void => {
    while (start < sortedChildren.length) {
      let totalBytes = 0
      for (let i = start; i < sortedChildren.length; i++) {
        totalBytes += sortedChildren[i].bytesInOutput_
      }

      let shortestSide = Math.min(w, h)
      let bytesToArea = (w * h) / totalBytes
      let end = start
      let areaInRun = 0
      let oldWorst = 0

      // Find the optimal split
      while (end < sortedChildren.length) {
        let area = sortedChildren[end].bytesInOutput_ * bytesToArea
        let newWorst = worst(start, end, shortestSide, areaInRun + area, bytesToArea)
        if (end > start && oldWorst < newWorst) break
        areaInRun += area
        oldWorst = newWorst
        end++
      }

      // Layout the run up to the split
      let split = Math.round(areaInRun / shortestSide)
      let areaInLayout = 0
      for (let i = start; i < end; i++) {
        let child = sortedChildren[i]
        let area = child.bytesInOutput_ * bytesToArea
        let lower = Math.round(shortestSide * areaInLayout / areaInRun)
        let upper = Math.round(shortestSide * (areaInLayout + area) / areaInRun)
        let [cx, cy, cw, ch] = w >= h
          ? [x, y + lower, split, upper - lower]
          : [x + lower, y, upper - lower, split]
        children.push({
          node_: child,
          box_: [cx, cy, cw, ch],
          children_: cw > CONSTANTS.INSET_X && ch > CONSTANTS.INSET_Y
            ? layoutTreemap(
              child.sortedChildren_,
              cx + CONSTANTS.PADDING,
              cy + CONSTANTS.HEADER_HEIGHT,
              cw - CONSTANTS.INSET_X,
              ch - CONSTANTS.INSET_Y)
            : [],
        })
        areaInLayout += area
      }

      // Layout everything remaining
      start = end
      if (w >= h) {
        x += split
        w -= split
      } else {
        y += split
        h -= split
      }
    }
  }

  squarify(0, x, y, w, h)
  return children
}

export let createTreemap = (metafile: Metafile): HTMLDivElement => {
  let tree = analyzeDirectoryTree(metafile)
  let layoutNodes: NodeLayout[] = []
  let componentEl = document.createElement('div')
  let mainEl = document.createElement('main')
  let canvas = document.createElement('canvas')
  let c = canvas.getContext('2d')!
  let width = 0
  let height = 0
  let animationFrame: number | null = null
  let hoveredNode: TreeNode | null = null
  let bgOriginX = 0
  let bgOriginY = 0
  let bgColor = ''
  let fgOnColor = ''
  let normalFont = '14px sans-serif', boldWidthCache: Record<number, number> = {}
  let boldFont = 'bold ' + normalFont, normalWidthCache: Record<number, number> = {}
  let ellipsisWidth = 0
  let currentWidthCache: Record<number, number> = normalWidthCache
  let currentNode: NodeLayout | null = null
  let currentLayout: NodeLayout | null = null
  let currentOriginX = 0
  let currentOriginY = 0
  let animationStart = 0
  let animationBlend = 1
  let animationSource: NodeLayout | null = null
  let animationTarget: NodeLayout | null = null

  let updateCurrentLayout = (): void => {
    if (currentNode) {
      let [ox1, oy1, ow, oh] = currentNode.box_
      let ox2 = ox1 + ow
      let oy2 = oy1 + oh
      let nx1 = Math.round(width / 10)
      let ny1 = Math.round(height / 10)
      let nx2 = width - nx1 - 1
      let ny2 = height - ny1 - 1
      let t = animationTarget ? animationBlend : 1 - animationBlend
      let x1 = Math.round(ox1 + (nx1 - ox1) * t)
      let y1 = Math.round(oy1 + (ny1 - oy1) * t)
      let x2 = Math.round(ox2 + (nx2 - ox2) * t)
      let y2 = Math.round(oy2 + (ny2 - oy2) * t)
      let wrap64 = (x: number) => x - Math.floor(x / 64 - 0.5) * 64
      currentLayout = layoutTreemap([currentNode.node_], x1, y1, x2 - x1, y2 - y1)[0]
      currentOriginX = wrap64(-(ox1 + ox2) / 2) * (1 - t) + (x1 + x2) / 2
      currentOriginY = wrap64(-(oy1 + oy2) / 2) * (1 - t) + (y1 + y2) / 2
    } else {
      currentLayout = null
      currentOriginX = 0
      currentOriginY = 0
    }
  }

  let resize = (): void => {
    let oldWidth = width
    let oldHeight = height
    let ratio = window.devicePixelRatio || 1
    width = Math.min(mainEl.clientWidth, 1600)
    height = Math.max(Math.round(width / 2), innerHeight - 200)
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    mainEl.style.height = height + 'px'
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    c.scale(ratio, ratio)
    if (width !== oldWidth || height !== oldHeight) {
      layoutNodes = layoutTreemap(tree.root_.sortedChildren_, 0, 0, width - 1, height - 1)
      updateCurrentLayout()
    }
    draw()
  }

  let tick = (): void => {
    let oldAnimationBlend = animationBlend
    let oldCurrentNode = currentNode
    animationBlend = (now() - animationStart) / CONSTANTS.ANIMATION_DURATION

    if (animationBlend < 0 || animationBlend > 1) {
      currentNode = animationTarget
      animationBlend = 1
      animationFrame = null
    } else {
      // Use a cubic "ease-out" curve
      animationBlend = 1 - animationBlend
      animationBlend *= animationBlend * animationBlend
      animationBlend = 1 - animationBlend
      animationFrame = requestAnimationFrame(tick)
    }

    if (animationBlend !== oldAnimationBlend || currentNode !== oldCurrentNode) {
      updateCurrentLayout()
    }
    draw()
  }

  let invalidate = (): void => {
    if (animationFrame === null) animationFrame = requestAnimationFrame(tick)
  }

  let charCodeWidth = (ch: number): number => {
    let width = currentWidthCache[ch]
    if (width === undefined) {
      width = c.measureText(String.fromCharCode(ch)).width
      currentWidthCache[ch] = width
    }
    return width
  }

  let textOverflowEllipsis = (text: string, width: number): [string, number] => {
    if (width < ellipsisWidth) return ['', 0]
    let textWidth = 0
    let n = text.length
    let i = 0
    while (i < n) {
      let charWidth = charCodeWidth(text.charCodeAt(i))
      if (width < textWidth + ellipsisWidth + charWidth) {
        return [text.slice(0, i) + '...', textWidth + ellipsisWidth]
      }
      textWidth += charWidth
      i++
    }
    return [text, textWidth]
  }

  let drawNodeBackground = (layout: NodeLayout, culling: Culling): DrawFlags => {
    let node = layout.node_
    let [x, y, w, h] = layout.box_
    let flags =
      (node === hoveredNode ? DrawFlags.CONTAINS_HOVER : 0) |
      (layout === animationTarget ? DrawFlags.CONTAINS_TARGET : 0)

    // Improve performance by not drawing backgrounds unnecessarily
    if (culling === Culling.Enabled && currentLayout) {
      let [cx, cy, cw, ch] = currentLayout.box_
      if (x >= cx && y >= cy && x + w <= cx + cw && y + h <= cy + ch) {
        culling = Culling.Culled
      }
    }

    for (let child of layout.children_) {
      flags |= drawNodeBackground(child, culling)
    }

    if (culling !== Culling.Culled && !node.isOutputFile_) {
      c.fillStyle = canvasFillStyleForInputPath(c, node.inputPath_, bgOriginX, bgOriginY, 1)
      if (layout.children_.length) {
        // Avoiding overdraw is probably a good idea...
        c.fillRect(x, y, w, CONSTANTS.HEADER_HEIGHT)
        c.fillRect(x, y + h - CONSTANTS.PADDING, w, CONSTANTS.PADDING)
        c.fillRect(x, y + CONSTANTS.HEADER_HEIGHT, CONSTANTS.PADDING, h - CONSTANTS.INSET_Y)
        c.fillRect(x + w - CONSTANTS.PADDING, y + CONSTANTS.HEADER_HEIGHT, CONSTANTS.PADDING, h - CONSTANTS.INSET_Y)
      } else {
        // Fill in the whole node if there are no children
        c.fillRect(x, y, w, h)
      }
    }

    return flags
  }

  let drawNodeForeground = (layout: NodeLayout, inCurrentNode: boolean): void => {
    let node = layout.node_
    let [x, y, w, h] = layout.box_
    let isOutputFile = node.isOutputFile_

    // Draw the hover highlight
    if (hoveredNode === node && !isOutputFile && (!currentNode || inCurrentNode)) {
      c.fillStyle = 'rgba(255,255,255,0.5)'
      c.fillRect(x, y, w, h)
    }

    if (!isOutputFile) {
      // Note: The stroke deliberately overlaps the right and bottom edges
      strokeRectWithFirefoxBugWorkaround(c, '#222', x + 0.5, y + 0.5, w, h)
    }

    if (h >= CONSTANTS.HEADER_HEIGHT) {
      c.fillStyle = isOutputFile ? fgOnColor : '#000'

      // Switch to the bold font
      if (isOutputFile) {
        c.font = boldFont
        currentWidthCache = boldWidthCache
        ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
      }

      // Measure the node name
      let maxWidth = w - CONSTANTS.INSET_X
      let textY = y + Math.round(CONSTANTS.INSET_Y / 2)
      let [nameText, nameWidth] = textOverflowEllipsis(node.name_, maxWidth)
      let textX = x + Math.round((w - nameWidth) / 2)

      // Switch to the normal font
      if (isOutputFile) {
        c.font = normalFont
        currentWidthCache = normalWidthCache
        ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
      }

      // Measure and draw the node detail (but only if there's more space and not for leaf nodes)
      if (nameText === node.name_ && node.sortedChildren_.length) {
        let detailText = ' – ' + (colorMode === COLOR.FORMAT ? moduleTypeLabelInputPath(node.inputPath_, '') : node.sizeText_)
        let [sizeText, sizeWidth] = textOverflowEllipsis(detailText, maxWidth - nameWidth)
        textX = x + Math.round((w - nameWidth - sizeWidth) / 2)
        c.globalAlpha = 0.5
        c.fillText(sizeText, textX + nameWidth, textY)
        c.globalAlpha = 1
      }

      // Switch to the bold font
      if (isOutputFile) {
        c.font = boldFont
        currentWidthCache = boldWidthCache
        ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
      }

      // Draw the node name
      c.fillText(nameText, textX, textY)

      // Switch to the normal font
      if (isOutputFile) {
        c.font = normalFont
        currentWidthCache = normalWidthCache
        ellipsisWidth = 3 * charCodeWidth(CONSTANTS.DOT_CHAR_CODE)
      }

      // Draw the node detail (only if there's enough space and only for leaf nodes)
      if (h > CONSTANTS.INSET_Y + 16 && !node.sortedChildren_.length) {
        let detailText = colorMode === COLOR.FORMAT ? moduleTypeLabelInputPath(node.inputPath_, '') : node.sizeText_
        let [sizeText, sizeWidth] = textOverflowEllipsis(detailText, maxWidth)
        c.globalAlpha = 0.5
        c.fillText(sizeText, x + Math.round((w - sizeWidth) / 2), y + CONSTANTS.HEADER_HEIGHT + Math.round(h - CONSTANTS.INSET_Y) / 2)
        c.globalAlpha = 1
      }

      // Draw the children
      for (let child of layout.children_) {
        drawNodeForeground(child, inCurrentNode)
      }
    }
  }

  let draw = (): void => {
    let bodyStyle = getComputedStyle(document.body)
    bgColor = bodyStyle.getPropertyValue('--bg')
    fgOnColor = bodyStyle.getPropertyValue('--fg-on')
    animationFrame = null

    c.clearRect(0, 0, width, height)
    c.textBaseline = 'middle'
    ellipsisWidth = c.measureText('...').width

    // Draw the full tree first
    let nodeContainingHover: NodeLayout | null = null
    let nodeContainingTarget: NodeLayout | null = null
    let transition = !currentLayout ? 0 : !animationSource
      ? animationBlend : !animationTarget ? 1 - animationBlend : 1
    bgOriginX = bgOriginY = 0
    for (let node of layoutNodes) {
      let flags = drawNodeBackground(node, Culling.Enabled)
      if (flags & DrawFlags.CONTAINS_HOVER) nodeContainingHover = node
      if (flags & DrawFlags.CONTAINS_TARGET) nodeContainingTarget = node
    }
    for (let node of layoutNodes) {
      drawNodeForeground(node, false)

      // Fade out nodes that aren't being hovered
      if (currentLayout || (nodeContainingHover && node !== nodeContainingHover)) {
        let [x, y, w, h] = node.box_
        c.globalAlpha = 0.6 * (!currentLayout || (!animationSource &&
          nodeContainingTarget && node !== nodeContainingTarget) ? 1 : transition)
        c.fillStyle = bgColor
        c.fillRect(x, y, w, h)
        c.globalAlpha = 1
      }
    }

    // Draw the current node on top
    if (currentLayout) {
      let [x, y, w, h] = currentLayout.box_
      let matrix = c.getTransform()
      let scale = Math.sqrt(matrix.a * matrix.d)

      // Draw a shadow under the node
      c.save()
      c.shadowColor = 'rgba(0,0,0,0.5)'
      c.shadowBlur = scale * (30 * transition)
      c.shadowOffsetX = scale * (2 * width)
      c.shadowOffsetY = scale * (2 * height + 15 * transition)
      c.fillRect(x - 2 * width, y - 2 * height, w, h)
      c.restore()

      bgOriginX = currentOriginX
      bgOriginY = currentOriginY
      drawNodeBackground(currentLayout, Culling.Disabled)
      drawNodeForeground(currentLayout, true)
    }
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

  let hitTestNode = (mouseEvent: MouseEvent | WheelEvent): NodeLayout | null => {
    let visit = (nodes: NodeLayout[], isTopLevel: boolean): NodeLayout | null => {
      for (let node of nodes) {
        let [x, y, w, h] = node.box_
        if (mouseX >= x && mouseY >= y && mouseX < x + w && mouseY < y + h) {
          return visit(node.children_, false) || (isTopLevel ? null : node)
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

    return currentLayout ? visit([currentLayout], false) : visit(layoutNodes, true)
  }

  let updateHover = (e: MouseEvent): void => {
    let layout = hitTestNode(e)
    changeHoveredNode(layout && layout.node_)

    // Show a tooltip for hovered nodes
    if (layout) {
      let node = layout.node_
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

  let changeHoveredNode = (node: TreeNode | null): void => {
    if (hoveredNode !== node) {
      hoveredNode = node
      canvas.style.cursor = node && !node.sortedChildren_.length ? 'pointer' : 'auto'
      invalidate()
    }
  }

  let searchFor = (children: NodeLayout[], node: TreeNode): NodeLayout | null => {
    for (let child of children) {
      let result = child.node_ === node ? child : searchFor(child.children_, node)
      if (result) return result
    }
    return null
  }

  let changeCurrentNode = (node: NodeLayout | null): void => {
    if (currentNode !== node) {
      animationBlend = 0
      animationStart = now()
      animationSource = currentNode
      animationTarget = node
      currentNode = node || searchFor(layoutNodes, currentNode!.node_)
      updateCurrentLayout()
      invalidate()
    }
  }

  canvas.onmousemove = e => {
    updateHover(e)
  }

  canvas.onmouseout = e => {
    changeHoveredNode(null)
    hideTooltip()
  }

  componentEl.onclick = e => {
    let layout = hitTestNode(e)
    if (layout) {
      let node = layout.node_
      if (!node.sortedChildren_.length) {
        showWhyFile(metafile, node.inputPath_, node.bytesInOutput_)
        updateHover(e)
      } else if (layout !== currentLayout) {
        changeCurrentNode(layout)
        changeHoveredNode(null)
        hideTooltip()
      } else {
        updateHover(e)
      }
    } else if (currentNode) {
      changeCurrentNode(null)
      updateHover(e)
    }
  }

  setWheelEventListener(e => {
    if (isWhyFileVisible()) return
    updateHover(e)
  })

  resize()
  Promise.resolve().then(resize) // Resize once the element is in the DOM
  setDarkModeListener(draw)
  setAfterColorMappingUpdate(draw)
  setResizeEventListener(resize)

  componentEl.id = styles.treemapPanel
  componentEl.innerHTML = ''
    + `<div class="${indexStyles.summary}">`
    + '<p>'
    + 'This visualization shows which input files were placed into each output file in the bundle. '
    + 'Click on a node to expand and focus it.'
    + '</p>'
    + '<p>'
    + '<b>Benefit of this chart type:</b> Makes the most of available screen area.'
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
