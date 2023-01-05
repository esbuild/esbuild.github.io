import { Metafile } from "./metafile"
import { accumulatePath, orderChildrenBySize, TreeNodeInProgress } from "./tree"
import { hueAngleToColor, isSourceMapPath, stripDisabledPathPrefix } from "./helpers"

export let generateDirectoryColorMapping = (metafile: Metafile): Record<string, string> => {
  let outputs = metafile.outputs
  let root: TreeNodeInProgress = { name_: '', inputPath_: '', bytesInOutput_: 0, children_: {} }
  let colorMapping: Record<string, string> = {}

  let assignColors = (node: TreeNodeInProgress, startAngle: number, sweepAngle: number): void => {
    let totalBytes = node.bytesInOutput_
    let children = node.children_
    let sorted: TreeNodeInProgress[] = []

    colorMapping[node.inputPath_] = hueAngleToColor(startAngle + sweepAngle / 2)

    for (let file in children) {
      sorted.push(children[file])
    }

    for (let child of sorted.sort(orderChildrenBySize)) {
      let childSweepAngle = child.bytesInOutput_ / totalBytes * sweepAngle
      assignColors(child, startAngle, childSweepAngle)
      startAngle += childSweepAngle
    }
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

  assignColors(root, 0, Math.PI * 2)
  return colorMapping
}
