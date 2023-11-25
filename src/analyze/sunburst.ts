import * as indexStyles from './index.css'
import * as styles from './sunburst.css'
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
  setAfterColorMappingUpdate,
} from './color'
import {
  bytesToText,
  isSourceMapPath,
  lastInteractionWasKeyboard,
  now,
  setDarkModeListener,
  setResizeEventListener,
  setWheelEventListener,
  shortenDataURLForDisplay,
  stripDisabledPathPrefix,
  textToHTML,
} from './helpers'

enum CONSTANTS {
  ANIMATION_DURATION = 350,
}

enum FLAGS {
  ROOT = 1,
  FILL = 2,
  CHAIN = 4,
  HOVER = 8,
}

interface TreeNode {
  inputPath_: string
  bytesInOutput_: number
  sortedChildren_: TreeNode[]
  parent_: TreeNode | null
}

interface Tree {
  root_: TreeNode
  maxDepth_: number
}

let isParentOf = (parent: TreeNode, child: TreeNode | null): boolean => {
  while (child) {
    if (child === parent) return true
    child = child.parent_
  }
  return false
}

let analyzeDirectoryTree = (metafile: Metafile): Tree => {
  let inputs = metafile.inputs
  let outputs = metafile.outputs
  let root: TreeNodeInProgress = { name_: '', inputPath_: '', bytesInOutput_: 0, children_: {} }

  let sortChildren = (node: TreeNodeInProgress): TreeNode => {
    let children = node.children_
    let sorted: TreeNode[] = []
    for (let file in children) {
      sorted.push(sortChildren(children[file]))
    }
    return {
      inputPath_: node.inputPath_,
      bytesInOutput_: node.bytesInOutput_,
      sortedChildren_: sorted.sort(orderChildrenBySize),
      parent_: null,
    }
  }

  let setParents = (node: TreeNode, depth: number): number => {
    let maxDepth = 0
    for (let child of node.sortedChildren_) {
      let childDepth = setParents(child, depth + 1)
      child.parent_ = node
      if (childDepth > maxDepth) maxDepth = childDepth
    }
    return maxDepth + 1
  }

  // Include the inputs with size 0 so we can see when something has been tree-shaken
  for (let i in inputs) {
    accumulatePath(root, stripDisabledPathPrefix(i), 0)
  }

  // For each output file
  for (let o in outputs) {
    if (isSourceMapPath(o)) continue

    let output = outputs[o]
    let inputs = output.inputs

    // Accumulate the input files that contributed to this output file
    for (let i in inputs) {
      accumulatePath(root, stripDisabledPathPrefix(i), inputs[i].bytesInOutput)
    }
  }

  let finalRoot = sortChildren(root)

  // Unwrap singularly-nested root nodes
  while (finalRoot.sortedChildren_.length === 1) {
    finalRoot = finalRoot.sortedChildren_[0]
  }

  return {
    root_: finalRoot,
    maxDepth_: setParents(finalRoot, 0),
  }
}

interface Slice {
  depth_: number
  startAngle_: number
  sweepAngle_: number
}

let narrowSlice = (root: TreeNode, node: TreeNode, slice: Slice): void => {
  if (root === node) return

  let parent = node.parent_!
  let totalBytes = parent.bytesInOutput_ || 1 // Don't divide by 0
  let bytesSoFar = 0
  narrowSlice(root, parent, slice)

  for (let child of parent.sortedChildren_) {
    if (child === node) {
      slice.startAngle_ += slice.sweepAngle_ * bytesSoFar / totalBytes
      slice.sweepAngle_ = child.bytesInOutput_ / totalBytes * slice.sweepAngle_
      break
    }
    bytesSoFar += child.bytesInOutput_
  }

  slice.depth_ += 1
}

let computeRadius = (depth: number): number => {
  return 50 * 8 * Math.log(1 + Math.log(1 + depth / 8))
}

export let createSunburst = (metafile: Metafile): HTMLDivElement => {
  let componentEl = document.createElement('div')
  let mainEl = document.createElement('main')
  let tree = analyzeDirectoryTree(metafile)
  let currentNode = tree.root_
  let hoveredNode: TreeNode | null = null

  let changeCurrentNode = (node: TreeNode): void => {
    if (currentNode !== node) {
      currentNode = node
      updateSunburst()
      updateDetails()
    }
  }

  let changeHoveredNode = (node: TreeNode | null): void => {
    if (hoveredNode !== node) {
      hoveredNode = node
      updateSunburst()
      updateDetails()
    }
  }

  let startSunburst = (): [() => void, () => void] => {
    let leftEl = document.createElement('div')
    let canvas = document.createElement('canvas')
    let c = canvas.getContext('2d')!

    let resize = (): void => {
      let maxRadius = 2 * Math.ceil(computeRadius(tree.maxDepth_))
      let ratio = window.devicePixelRatio || 1
      width = Math.min(Math.round(innerWidth * 0.4), maxRadius)
      height = width
      centerX = width >> 1
      centerY = height >> 1
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      c.scale(ratio, ratio)
      draw()
    }

    // We want to avoid overlapping strokes from lots of really small adjacent
    // slices all merging together into a solid color. So we enforce a
    // minimum slice width of 2px and we also skip drawing slices that
    // have a tail edge less than 1.5px from the previous tail edge.
    let drawNode = (node: TreeNode, depth: number, innerRadius: number, startAngle: number, sweepAngle: number, flags: FLAGS, prevTailEdge: number): number => {
      let outerRadius = computeRadius(depth + 1)
      if (outerRadius > centerY) return prevTailEdge // Don't draw slices that fall outside the canvas bounds

      if (node === hoveredNode) {
        flags |= FLAGS.HOVER
      }

      let middleRadius = (innerRadius + outerRadius) / 2
      let tailEdge = startAngle + sweepAngle
      if (tailEdge - prevTailEdge < 1.5 / middleRadius) return prevTailEdge
      let clampedSweepAngle = 2 / middleRadius
      if (sweepAngle > clampedSweepAngle) clampedSweepAngle = sweepAngle

      // Handle the fill
      if (flags & FLAGS.FILL) {
        c.fillStyle = canvasFillStyleForInputPath(c, node.inputPath_, centerX, centerY, 1)
        c.beginPath()
        c.arc(centerX, centerY, innerRadius, startAngle, startAngle + clampedSweepAngle, false)
        c.arc(centerX, centerY, outerRadius, startAngle + clampedSweepAngle, startAngle, true)
        c.fill()
        if (hoveredNode && (flags & FLAGS.HOVER || node.parent_ === hoveredNode)) {
          c.fillStyle = 'rgba(255, 255, 255, 0.3)'
          c.fill()
        }
      }

      // Handle the stroke
      else {
        let isFullCircle = clampedSweepAngle === Math.PI * 2
        let moveToRadius = flags & FLAGS.CHAIN || isFullCircle ? outerRadius : innerRadius
        if (flags & FLAGS.ROOT && innerRadius > 0) c.arc(centerX, centerY, innerRadius, startAngle + clampedSweepAngle, startAngle, true)
        c.moveTo(centerX + moveToRadius * Math.cos(startAngle), centerY + moveToRadius * Math.sin(startAngle))
        c.arc(centerX, centerY, outerRadius, startAngle, startAngle + clampedSweepAngle, false)
        if (!isFullCircle) c.lineTo(centerX + innerRadius * Math.cos(startAngle + clampedSweepAngle), centerY + innerRadius * Math.sin(startAngle + clampedSweepAngle))
      }

      let totalBytes = node.bytesInOutput_
      let childFlags = flags & (FLAGS.FILL | FLAGS.HOVER)
      let bytesSoFar = 0
      let childTailEdge = -Infinity

      for (let child of node.sortedChildren_) {
        childTailEdge = drawNode(child, depth + 1, outerRadius, startAngle + sweepAngle * bytesSoFar / totalBytes, child.bytesInOutput_ / totalBytes * sweepAngle, childFlags, childTailEdge)
        bytesSoFar += child.bytesInOutput_
        childFlags |= FLAGS.CHAIN
      }

      return tailEdge
    }

    let draw = (): void => {
      c.clearRect(0, 0, width, height)

      // Draw the fill first
      drawNode(animatedNode, animatedDepth, computeRadius(animatedDepth), animatedStartAngle, animatedSweepAngle, FLAGS.ROOT | FLAGS.FILL, -Infinity)

      // Draw the stroke second
      c.strokeStyle = '#222'
      c.beginPath()
      drawNode(animatedNode, animatedDepth, computeRadius(animatedDepth), animatedStartAngle, animatedSweepAngle, FLAGS.ROOT, -Infinity)
      c.stroke()

      // Draw the size of the current node in the middle
      if (animatedDepth === 0) {
        c.fillStyle = '#222'
        c.font = 'bold 16px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(bytesToText(targetNode.bytesInOutput_), centerX, centerY)
      }
    }

    let START_ANGLE = -Math.PI / 2
    let width = 0
    let height = 0
    let centerX = 0
    let centerY = 0

    let animationFrame: number | null = null
    let animationStart = 0

    let sourceDepth = 0
    let sourceStartAngle = START_ANGLE
    let sourceSweepAngle = Math.PI * 2

    let targetNode = currentNode
    let targetDepth = sourceDepth
    let targetStartAngle = sourceStartAngle
    let targetSweepAngle = sourceSweepAngle

    let animatedNode = currentNode
    let animatedDepth = sourceDepth
    let animatedStartAngle = sourceStartAngle
    let animatedSweepAngle = sourceSweepAngle

    let hitTestNode = (mouseEvent: MouseEvent): TreeNode | null => {
      let visit = (node: TreeNode, depth: number, innerRadius: number, startAngle: number, sweepAngle: number): TreeNode | null => {
        let outerRadius = computeRadius(depth + 1)
        if (outerRadius > centerY) return null // Don't draw slices that fall outside the canvas bounds

        // Hit-test the current node
        if (mouseRadius >= innerRadius && mouseRadius < outerRadius) {
          let deltaAngle = mouseAngle - startAngle
          deltaAngle /= Math.PI * 2
          deltaAngle -= Math.floor(deltaAngle)
          deltaAngle *= Math.PI * 2
          if (deltaAngle < sweepAngle) {
            if (node === animatedNode) return node.parent_
            return node
          }
        }

        let totalBytes = node.bytesInOutput_
        let bytesSoFar = 0

        // Hit-test the children
        for (let child of node.sortedChildren_) {
          let hit = visit(child, depth + 1, outerRadius, startAngle + sweepAngle * bytesSoFar / totalBytes, child.bytesInOutput_ / totalBytes * sweepAngle)
          if (hit) return hit
          bytesSoFar += child.bytesInOutput_
        }

        return null
      }

      let x = mouseEvent.pageX
      let y = mouseEvent.pageY
      for (let el: HTMLElement | null = canvas; el; el = el.offsetParent as HTMLElement | null) {
        x -= el.offsetLeft
        y -= el.offsetTop
      }

      x -= centerX
      y -= centerY
      let mouseRadius = Math.sqrt(x * x + y * y)
      let mouseAngle = Math.atan2(y, x)
      return visit(animatedNode, animatedDepth, computeRadius(animatedDepth), animatedStartAngle, animatedSweepAngle)
    }

    let tick = (): void => {
      let t = (now() - animationStart) / CONSTANTS.ANIMATION_DURATION

      if (t < 0 || t > 1) {
        t = 1
        animationFrame = null
        animatedNode = targetNode
        targetDepth = 0
        targetStartAngle = START_ANGLE
        targetSweepAngle = Math.PI * 2
      } else {
        // Use a cubic "ease-in-out" curve
        if (t < 0.5) {
          t *= 4 * t * t
        } else {
          t = 1 - t
          t *= 4 * t * t
          t = 1 - t
        }
        animationFrame = requestAnimationFrame(tick)
      }

      animatedDepth = sourceDepth + (targetDepth - sourceDepth) * t
      animatedStartAngle = sourceStartAngle + (targetStartAngle - sourceStartAngle) * t
      animatedSweepAngle = sourceSweepAngle + (targetSweepAngle - sourceSweepAngle) * t

      draw()
    }

    let tooltipEl = document.createElement('div')

    let showTooltip = (x: number, y: number, html: string): void => {
      tooltipEl.style.display = 'block'
      tooltipEl.style.left = x + 'px'
      tooltipEl.style.top = y + 'px'
      tooltipEl.innerHTML = html
    }

    let hideTooltip = (): void => {
      tooltipEl.style.display = 'none'
    }

    let previousHoveredNode: TreeNode | null = null
    let historyStack: TreeNode[] = []

    let handleMouseMove = (e: MouseEvent): void => {
      let node = hitTestNode(e)
      changeHoveredNode(node)

      // Show a tooltip for hovered nodes
      if (node && node !== animatedNode.parent_) {
        let tooltip = node.inputPath_
        if (node.parent_ && node.parent_.inputPath_ !== '') {
          let i = node.parent_.inputPath_.length
          tooltip = textToHTML(tooltip.slice(0, i)) + '<b>' + textToHTML(tooltip.slice(i)) + '</b>'
        } else {
          tooltip = '<b>' + textToHTML(shortenDataURLForDisplay(tooltip)) + '</b>'
        }
        if (colorMode === COLOR.FORMAT) tooltip += textToHTML(moduleTypeLabelInputPath(node.inputPath_, ' – '))
        else tooltip += ' – ' + textToHTML(bytesToText(node.bytesInOutput_))
        showTooltip(e.pageX, e.pageY + 20, tooltip)
        canvas.style.cursor = 'pointer'
      } else {
        hideTooltip()
      }
    }

    resize()
    setDarkModeListener(draw)
    setResizeEventListener(resize)

    setWheelEventListener(e => {
      if (isWhyFileVisible()) return
      handleMouseMove(e)
    })

    canvas.onmousemove = e => {
      handleMouseMove(e)
    }

    canvas.onmouseout = () => {
      changeHoveredNode(null)
      hideTooltip()
    }

    canvas.onclick = e => {
      let node = hitTestNode(e)
      if (!node) return
      hideTooltip()

      let stack: TreeNode[] = []

      // Handle clicking in the middle node
      if (node !== animatedNode.parent_) {
        stack = historyStack.concat(currentNode)
      } else if (historyStack.length > 0) {
        node = historyStack.pop()!
        stack = historyStack.slice()
      }

      if (node.sortedChildren_.length > 0) {
        changeCurrentNode(node)
        historyStack = stack
      } else {
        e.preventDefault() // Prevent the browser from removing the focus on the dialog
        showWhyFile(metafile, node.inputPath_, node.bytesInOutput_)
      }
    }

    leftEl.className = styles.left
    leftEl.append(canvas, colorLegendEl)

    tooltipEl.className = indexStyles.tooltip
    mainEl.append(tooltipEl, leftEl)

    return [draw, () => {
      if (previousHoveredNode !== hoveredNode) {
        previousHoveredNode = hoveredNode
        if (!hoveredNode) {
          canvas.style.cursor = 'auto'
          hideTooltip()
        }
        if (animationFrame === null) animationFrame = requestAnimationFrame(tick)
      }

      if (targetNode === currentNode) return
      historyStack.length = 0

      if (animationFrame === null) animationFrame = requestAnimationFrame(tick)
      animationStart = now()

      // Animate from parent to child
      if (isParentOf(animatedNode, currentNode)) {
        let slice: Slice = {
          depth_: animatedDepth,
          startAngle_: animatedStartAngle,
          sweepAngle_: animatedSweepAngle,
        }
        narrowSlice(animatedNode, currentNode, slice)
        animatedDepth = slice.depth_
        animatedStartAngle = slice.startAngle_
        animatedSweepAngle = slice.sweepAngle_
        targetDepth = 0
        targetStartAngle = START_ANGLE
        targetSweepAngle = Math.PI * 2
        animatedNode = currentNode
      }

      // Animate from child to parent
      else if (isParentOf(currentNode, animatedNode)) {
        let slice: Slice = {
          depth_: 0,
          startAngle_: START_ANGLE,
          sweepAngle_: Math.PI * 2,
        }
        narrowSlice(currentNode, animatedNode, slice)
        targetDepth = slice.depth_
        targetStartAngle = slice.startAngle_
        targetSweepAngle = slice.sweepAngle_
      }

      else {
        animationStart = -Infinity
        animatedNode = currentNode
      }

      sourceDepth = animatedDepth
      sourceStartAngle = animatedStartAngle
      sourceSweepAngle = animatedSweepAngle
      targetNode = currentNode
    }]
  }

  let startDetails = (): [() => void, () => void] => {
    let detailsEl = document.createElement('div')

    let regenerate = (): void => {
      let parent = currentNode.parent_
      let children = currentNode.sortedChildren_
      let barsEl = document.createElement('div')
      let maxBytesInOutput = 1
      barsEl.className = styles.bars

      for (let child of children) {
        let bytesInOutput = child.bytesInOutput_
        if (bytesInOutput > maxBytesInOutput) maxBytesInOutput = bytesInOutput
      }

      generatedNodes.length = 0
      generatedRows.length = 0

      // Provide a link to the parent directory
      if (parent) {
        let rowEl = document.createElement('a')
        rowEl.className = styles.row
        rowEl.tabIndex = 0
        barsEl.append(rowEl)

        let nameEl = document.createElement('div')
        nameEl.className = styles.name
        rowEl.append(nameEl)

        let sizeEl = document.createElement('div')
        sizeEl.className = styles.size
        rowEl.append(sizeEl)

        // Use a link so we get keyboard support
        rowEl.href = 'javascript:void 0'
        nameEl.textContent = '../'
        rowEl.onclick = () => {
          changeCurrentNode(parent!)
          if (lastInteractionWasKeyboard && generatedRows.length > 0) {
            generatedRows[0].focus()
          }
        }
        rowEl.onfocus = rowEl.onmouseover = () => changeHoveredNode(parent)
        rowEl.onblur = rowEl.onmouseout = () => changeHoveredNode(null)
        generatedNodes.push(parent)
        generatedRows.push(rowEl)
      }

      for (let child of children) {
        let name = child.inputPath_.slice(currentNode.inputPath_.length)
        let size = bytesToText(child.bytesInOutput_)

        let rowEl = document.createElement('a')
        rowEl.className = styles.row
        rowEl.tabIndex = 0
        barsEl.append(rowEl)

        let nameEl = document.createElement('div')
        nameEl.className = styles.name
        nameEl.innerHTML = textToHTML(name === child.inputPath_ ? shortenDataURLForDisplay(name) : name)
        rowEl.append(nameEl)

        let sizeEl = document.createElement('div')
        sizeEl.className = styles.size
        rowEl.append(sizeEl)

        let barEl = document.createElement('div')
        let bgColor = cssBackgroundForInputPath(child.inputPath_)
        barEl.className = styles.bar + (child.bytesInOutput_ ? '' : ' ' + styles.empty)
        barEl.style.background = bgColor
        barEl.style.width = 100 * child.bytesInOutput_ / maxBytesInOutput + '%'
        sizeEl.append(barEl)

        let bytesEl = document.createElement('div')
        bytesEl.className = styles.last
        bytesEl.textContent = colorMode === COLOR.FORMAT ? moduleTypeLabelInputPath(child.inputPath_, '') : size
        barEl.append(bytesEl)

        // Use a link so we get keyboard support
        rowEl.href = 'javascript:void 0'
        rowEl.onclick = e => {
          e.preventDefault() // Prevent meta+click from opening a new tab
          if (child.sortedChildren_.length > 0) {
            changeCurrentNode(child)
            if (lastInteractionWasKeyboard && generatedRows.length > 0) {
              generatedRows[0].focus()
            }
          } else {
            showWhyFile(metafile, child.inputPath_, child.bytesInOutput_)
          }
        }
        rowEl.onfocus = rowEl.onmouseover = () => changeHoveredNode(child)
        rowEl.onblur = rowEl.onmouseout = () => changeHoveredNode(null)
        generatedNodes.push(child)
        generatedRows.push(rowEl)
      }

      let directoryEl = document.createElement('div')
      directoryEl.className = styles.dir
      directoryEl.textContent = 'Directory: '

      let segmentsEl = document.createElement('div')
      segmentsEl.className = styles.segments
      directoryEl.append(segmentsEl)

      for (let node: TreeNode | null = currentNode; node; node = node.parent_) {
        let text = node.inputPath_ || '/'
        let nodeEl = document.createElement('a')
        if (node.parent_) text = text.slice(node.parent_.inputPath_.length)
        nodeEl.textContent = text
        if (node !== currentNode) {
          nodeEl.href = 'javascript:void 0'
          nodeEl.onclick = e => {
            e.preventDefault() // Prevent meta+click from opening a new tab
            changeCurrentNode(node!)
            if (lastInteractionWasKeyboard && generatedRows.length > 0) {
              // Don't focus the no-op element if it's present
              generatedRows[!generatedNodes[0] && generatedRows.length > 1 ? 1 : 0].focus()
            }
          }
        }
        segmentsEl.insertBefore(nodeEl, segmentsEl.firstChild)

        // If a user repeatedly presses enter when focusing "../" to traverse
        // up to the top level, focus this top-level element. We don't want
        // to focus the first row because then enter will re-descend down the
        // tree. But use a tab index of -1 so this never gets focus naturally.
        if (currentNode == tree.root_) {
          nodeEl.tabIndex = -1
          generatedNodes.unshift(currentNode)
          generatedRows.unshift(nodeEl)
        }
      }

      detailsEl.innerHTML = ''
      detailsEl.append(directoryEl, barsEl)
    }

    let generatedNodes: (TreeNode | null)[] = []
    let generatedRows: HTMLAnchorElement[] = []
    let previousNode = currentNode
    let previousHoveredNode: TreeNode | null = null
    let previousHoveredElement: HTMLAnchorElement | null = null

    detailsEl.className = styles.details
    mainEl.append(detailsEl)
    regenerate()

    return [regenerate, () => {
      if (previousNode !== currentNode) {
        previousNode = currentNode
        regenerate()
      }

      if (previousHoveredNode !== hoveredNode) {
        previousHoveredNode = hoveredNode

        if (previousHoveredElement) {
          previousHoveredElement.classList.remove('hover')
          previousHoveredElement = null
        }

        for (let node: TreeNode | null = hoveredNode; node; node = node.parent_) {
          let index = generatedNodes.indexOf(node)
          if (index >= 0) {
            previousHoveredElement = generatedRows[index]
            previousHoveredElement.classList.add('hover')
            break
          }
        }
      }
    }]
  }

  let [redrawSunburst, updateSunburst] = startSunburst()
  let [regenerateDetails, updateDetails] = startDetails()

  setAfterColorMappingUpdate(() => {
    redrawSunburst()
    regenerateDetails()
  })

  componentEl.id = styles.sunburstPanel
  componentEl.innerHTML = ''
    + `<div class="${indexStyles.summary}">`
    + '<p>'
    + 'This visualization shows how much space each input file takes up in the final bundle. '
    + 'Input files that take up 0 bytes have been completely eliminated by tree-shaking.'
    + '</p>'
    + '<p>'
    + '<b>Benefit of this chart type:</b> Can be navigated with the keyboard.'
    + '</p>'
    + '</div>'
  componentEl.append(mainEl)
  return componentEl
}
