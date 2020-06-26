import { exportQuickFix, openFile } from "@/connector/open-file"
import { createBulkLineConsumer, createSingleLineConsumer } from "@/fzf/process/consumer/consumer"
import type { ConvertedLine, ExportQuickFix, OpenCommand, OpenFile } from "@/type"

type ParsedLine = {
  file: string
  lineNumber?: number
  text?: string
}

const parseConvertedLine = (convertedLine: ConvertedLine): ParsedLine => {
  const fileResult = /^(?<file>\S+)/.exec(convertedLine)
  const fileAndLineNumberResult = /^(?<file>\S+):(?<lineNumber>\d+):?(?<text>.*)/.exec(convertedLine)

  if ((!fileAndLineNumberResult || !fileAndLineNumberResult.groups) && fileResult && fileResult.groups) {
    return {
      file: fileResult.groups.file
    }
  }

  if (fileAndLineNumberResult && fileAndLineNumberResult.groups) {
    const { file, lineNumber, text } = fileAndLineNumberResult.groups
    return {
      file,
      lineNumber: Number(lineNumber),
      text
    }
  }

  throw new Error(`ConvertedLine is invalid: '${convertedLine}'`)
}

const createOpenFileConsumer = (openCommand: OpenCommand) =>
  createSingleLineConsumer(async (convertedLine) => {
    const { file, lineNumber } = parseConvertedLine(convertedLine)
    const openFileFormat: OpenFile = { openCommand, file, lineNumber }
    await openFile(openFileFormat)
  })

export const editConsumer = createOpenFileConsumer("edit")
export const splitConsumer = createOpenFileConsumer("split")
export const vsplitConsumer = createOpenFileConsumer("vsplit")
export const tabeditConsumer = createOpenFileConsumer("tabedit")

export const exportQuickfixConsumer = createBulkLineConsumer(async (lines) => {
  const quickFixList: Array<ExportQuickFix> = lines
    .map((line) => parseConvertedLine(line))
    .map((parsedLine) => {
      const { file, lineNumber, text } = parsedLine
      if (lineNumber == null && text == null) {
        return {
          filename: file
        }
      }

      if (lineNumber != null && text != null) {
        return {
          filename: file,
          lnum: lineNumber,
          text
        }
      }

      throw new Error(`ConvertedLine is invalid: '${parsedLine.toString()}'`)
    })

  await exportQuickFix(quickFixList)
})
