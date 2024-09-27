import * as fs from 'fs';
import path from 'path'

export enum HttpMethods {
  post,
  get,
  put,
  delete,
}

export class FileUtils {
  static copyFiles = async (args: {
    originPath: string,
    destPath: string,
    onBeforeCopy?: (originFileName: string, originFilePath: string, destFilePath: string) => Promise<boolean>
    onAfterCopy?: (originFileName: string, originFilePath: string, destFilePath: string) => Promise<void>
  }) => {
    if (!fs.existsSync(args.destPath))
      fs.mkdirSync(args.destPath)

    console.log(`copyFiles() begin`)
    console.log(`args: ${JSON.stringify(args, null, 4)}`)

    const originFiles = fs.readdirSync(args.originPath)
    originFiles.forEach(async originFileName => {
      console.log(`originFileName: ${JSON.stringify(originFileName, null, 4)}`)
      const originFilePath = path.resolve(args.originPath, originFileName)
      console.log(`originFilePath: ${JSON.stringify(originFilePath, null, 4)}`)

      const destFilePath = path.resolve(args.destPath, originFileName)
      console.log(`destFilePath: ${destFilePath}`)

      const originFileStats = fs.statSync(originFilePath)
      if (originFileStats.isFile()) {
        console.log('isFile')

        const canCopy = args.onBeforeCopy ? args.onBeforeCopy(originFileName, originFilePath, destFilePath) : true
        if (canCopy) {
          fs.copyFileSync(originFilePath, destFilePath)
          if (args.onAfterCopy)
            await args.onAfterCopy(originFileName, originFilePath, destFilePath)
        }
      }
      else if (originFileStats.isDirectory()) {
        console.log('isDirectory')

        const canCopy = args.onBeforeCopy ? args.onBeforeCopy(originFileName, originFilePath, destFilePath) : true
        if (canCopy) {
          FileUtils.copyFiles({
            originPath: originFilePath,
            destPath: destFilePath
          })
          if (args.onAfterCopy)
            await args.onAfterCopy(originFileName, originFilePath, destFilePath)
        }
      }
    })
    console.log(`end copyFiles()`)
  }

  static searchInFiles = (args: {
    path: string,
    searchString: string
  }) => {
    let searchedFiles: string[] = []

    const files = fs.readdirSync(args.path)
    files.forEach(fileName => {
      const filePath = path.resolve(args.path, fileName)

      const fileStats = fs.statSync(filePath)
      if (fileStats.isFile()) {
        const content = fs.readFileSync(filePath, 'utf8')
        console.log('content')

        if (content.indexOf(args.searchString) != -1) {
          searchedFiles.push(filePath)
        }
      }
      else if (fileStats.isDirectory()) {
        searchedFiles = [
          ...searchedFiles,
          ...FileUtils.searchInFiles({
            path: filePath,
            searchString: args.searchString
          })
        ]
      }
    })

    return searchedFiles
  }
}

export {
  
}