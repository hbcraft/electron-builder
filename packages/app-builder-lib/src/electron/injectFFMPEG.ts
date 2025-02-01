import * as fs from "fs"
import * as path from "path"
import { ElectronPlatformName } from "./ElectronFramework"

import { executeAppBuilder, exists, isEmptyOrSpaces, log, PADDING } from "builder-util"
import { PrepareApplicationStageDirectoryOptions } from "../Framework"
import { downloadArtifact, ElectronPlatformArtifactDetails, GotDownloaderOptions } from "@electron/get"
import * as chalk from "chalk"
import { MultiProgress } from "electron-publish/out/multiProgress"
import { mkdir } from "fs-extra"

// NOTE: Adapted from https://github.com/MarshallOfSound/electron-packager-plugin-non-proprietary-codecs-ffmpeg to resolve dependency vulnerabilities
const downloadFFMPEG = async (progress: MultiProgress | null, options: PrepareApplicationStageDirectoryOptions, version: string) => {
  const ffmpegFileName = `ffmpeg-v${version}-${options.platformName}-${options.arch}`

  log.info({ ffmpegFileName }, "downloading")
  const progressBar = progress?.createBar(`${" ".repeat(PADDING + 2)}[:bar] :percent | ${chalk.green(ffmpegFileName)}`, { total: 100 })
  progressBar?.render()

  const tempDirectory = await options.packager.info.tempDirManager.getTempDir({ prefix: "temp-electron" })
  await mkdir(tempDirectory)

  let cacheEnv = process.env.ELECTRON_BUILDER_CACHE
  if (cacheEnv && isEmptyOrSpaces(cacheEnv) && (await exists(cacheEnv))) {
    cacheEnv = path.resolve(cacheEnv)
  }
  const {
    packager: {
      config: { electronDownload },
    },
    platformName,
    arch,
  } = options

  const artifactConfig: ElectronPlatformArtifactDetails = {
    cacheRoot: cacheEnv,
    tempDirectory,
    ...(electronDownload ?? {}),
    platform: platformName,
    arch,
    version,
    artifactName: "ffmpeg",
    downloadOptions: {
      getProgressCallback: progress => {
        if (progressBar) {
          progressBar.update(progress.percent)
        }
      },
    } as GotDownloaderOptions,
  }
  const file = await downloadArtifact(artifactConfig)
  const ffmpegDir = await options.packager.info.tempDirManager.getTempDir({ prefix: "ffmpeg" })
  await executeAppBuilder(["unzip", "--input", file, "--output", ffmpegDir])
  progressBar?.update(100)
  progressBar?.terminate()
  return ffmpegDir
}

const copyFFMPEG = (targetPath: string, platform: ElectronPlatformName) => (sourcePath: string) => {
  let fileName = "ffmpeg.dll"
  if (["darwin", "mas"].includes(platform)) {
    fileName = "libffmpeg.dylib"
  } else if (platform === "linux") {
    fileName = "libffmpeg.so"
  }

  const libPath = path.resolve(sourcePath, fileName)
  const libTargetPath = path.resolve(targetPath, fileName)
  log.info({ lib: log.filePath(libPath), target: libTargetPath }, "copying non-proprietary FFMPEG")

  // If the source doesn't exist we have a problem
  if (!fs.existsSync(libPath)) {
    throw new Error(`Failed to find FFMPEG library file at path: ${libPath}`)
  }

  // If we are copying to the source we can stop immediately
  if (libPath !== libTargetPath) {
    fs.copyFileSync(libPath, libTargetPath)
  }
  return libTargetPath
}

export default function injectFFMPEG(progress: MultiProgress | null, options: PrepareApplicationStageDirectoryOptions, electrionVersion: string, productFilename: string) {
  let libPath = options.appOutDir
  if (options.platformName === "darwin") {
    libPath = path.join(options.appOutDir, `${productFilename}.app`, "/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries")
  }

  return downloadFFMPEG(progress, options, electrionVersion).then(copyFFMPEG(libPath, options.platformName))
}
