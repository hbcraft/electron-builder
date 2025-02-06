import { downloadArtifact as _downloadArtifact, ElectronDownloadCacheMode, ElectronPlatformArtifactDetails, GotDownloaderOptions, MirrorOptions } from "@electron/get"
import { getUserDefinedCacheDir, PADDING } from "builder-util"
import * as chalk from "chalk"
import { MultiProgress } from "electron-publish/out/multiProgress"
import { mkdir } from "fs-extra"
import { TmpDir } from "temp-file"

export type ElectronDownloadOptions = Omit<
  ElectronPlatformArtifactDetails,
  "platform" | "arch" | "version" | "artifactName" | "artifactSuffix" | "customFilename" | "tempDirectory" | "downloader" | "cacheMode" | "cacheRoot"
> & {
  mirrorOptions: Omit<MirrorOptions, "customDir" | "customFilename" | "customVersion">
}

type ElectronGetDownloadConfig = {
  electronDownload?: ElectronDownloadOptions
  artifactName: string
  platformName: string
  arch: string
  version: string
  tempDirManager: TmpDir
  progress: MultiProgress | null
}

export async function downloadArtifact(config: ElectronGetDownloadConfig) {
  const { progress, tempDirManager, electronDownload, arch, version, platformName, artifactName } = config

  const progressBar = progress?.createBar(`${" ".repeat(PADDING + 2)}[:bar] :percent | ${chalk.green(artifactName)}`, { total: 100 })
  progressBar?.render()

  const tempDirectory = await tempDirManager.getTempDir({ prefix: `temp-${artifactName}` })
  await mkdir(tempDirectory)

  const cacheEnv = await getUserDefinedCacheDir()

  const artifactConfig: ElectronPlatformArtifactDetails = {
    cacheMode: cacheEnv ? ElectronDownloadCacheMode.ReadOnly : undefined,
    cacheRoot: cacheEnv,
    tempDirectory,
    ...(electronDownload ?? {}),
    platform: platformName,
    arch,
    version,
    artifactName,
    downloadOptions: {
      getProgressCallback: progress => {
        if (progressBar) {
          progressBar.update(progress.percent)
        }
      },
    } as GotDownloaderOptions,
  }

  const dist = await _downloadArtifact(artifactConfig)
  progressBar?.update(100)
  progressBar?.terminate()

  return dist
}
