import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import * as semver from 'semver';
import * as httpm from '@actions/http-client';
import * as sys from './system';
import os from 'os';
import {cp} from 'fs';
import * as child_process from 'child_process';

export interface ISpiceVersion {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  author: ISpiceGitHubUser;
  assets: ISpiceDownloadAsset[];
}

export interface ISpiceGitHubUser {
  login: string;
  type: 'User' | 'Bot';
}

export interface ISpiceDownloadAsset {
  name: string;
  uploader: ISpiceGitHubUser;
  content_type: string;
  browser_download_url: string;
}

export interface ISpiceVersionInfo {
  downloadUrl: string;
  resolvedVersion: string;
  fileName: string;
}

export async function getSpice(
  versionSpec: string,
  stable: boolean,
  drafts: boolean,
  auth: string | undefined
) {
  // check cache
  const toolPath: string = tc.find('spice', versionSpec);
  // If not found in cache, download
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  }
  core.info(`Attempting to download ${versionSpec}...`);
  let downloadPath = '';
  let info: ISpiceVersionInfo | null = null;

  // download and install Spice
  try {
    info = await getInfoFromDist(versionSpec, stable, drafts);
    if (!info) {
      throw new Error(
        `Could not find a suitable Spice version to match the given version spec '${versionSpec}'. Aborting.`
      );
    }

    downloadPath = await installSpiceVersion(info, auth);
  } catch (err) {
    throw new Error(`Failed to download Spice version ${versionSpec}: ${err}`);
  }

  return downloadPath;
}

async function installSpiceVersion(
  info: ISpiceVersionInfo,
  auth: string | undefined
): Promise<string> {
  core.info(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`);
  const downloadPath = await tc.downloadTool(info.downloadUrl, undefined, auth);

  core.info('Extracting Spice ...');
  const extPath = await extractSpiceArchive(downloadPath);
  core.info(`Successfully extracted Spice to ${extPath}`);

  core.info('Adding to the cache ...');
  const cachedDir = await tc.cacheDir(
    extPath,
    'spice',
    makeSemver(info.resolvedVersion)
  );
  core.info(`Successfully cached Spice to ${cachedDir}`);
  return cachedDir;
}

export async function extractSpiceArchive(
  archivePath: string
): Promise<string> {
  const platform = os.platform();
  let extPath: string;

  if (platform === 'win32') {
    extPath = await tc.extractZip(archivePath);
  } else {
    extPath = await tc.extractTar(archivePath);
  }

  return extPath;
}

async function getInfoFromDist(
  versionSpec: string,
  stable: boolean,
  drafts: boolean
): Promise<ISpiceVersionInfo | null> {
  let version: ISpiceVersion | undefined;
  version = await findMatch(versionSpec, stable, drafts);
  if (!version) return null;

  return <ISpiceVersionInfo>{
    downloadUrl: version.assets[0].browser_download_url,
    resolvedVersion: version.tag_name,
    fileName: version.assets[0].name
  };
}

export async function findMatch(
  versionSpec: string,
  stable: boolean,
  drafts: boolean
): Promise<ISpiceVersion | undefined> {
  const archFilter = sys.getArch();
  const platFilter = sys.getPlatform();
  const assetFileExt = platFilter === 'windows' ? 'zip' : 'tar.gz';
  const expectedAssetName = `spice_${platFilter}_${archFilter}.${assetFileExt}`;
  core.debug(`Expected asset name: ${expectedAssetName}`);

  let result: ISpiceVersion | undefined;
  let match: ISpiceVersion | undefined;

  const versionDistUrl: string =
    'https://api.github.com/repos/spicelang/spice/releases';
  let candidates = await getVersionsDist(versionDistUrl);
  if (!candidates)
    throw new Error(`spicelang download url did not return results`);

  // Filter out drafts
  if (!drafts) {
    core.info('Not considierung drafts');
    candidates = candidates.filter(candidate => !candidate.draft);
  }

  // Filter out unstable
  if (stable) {
    core.info('Not considierung unstable releases');
    candidates = candidates.filter(candidate => !candidate.prerelease);
  }

  let spiceAsset: ISpiceDownloadAsset | undefined;
  for (let i = 0; i < candidates.length; i++) {
    let candidate: ISpiceVersion = candidates[i];
    let version = makeSemver(candidate.tag_name);

    core.debug(
      `check if version ${version} satisfies the given spec ${versionSpec}`
    );
    if (semver.satisfies(version, versionSpec)) {
      spiceAsset = candidate.assets.find(
        asset => asset.name === expectedAssetName
      );

      if (spiceAsset) {
        core.debug(`matched ${candidate.tag_name}`);
        match = candidate;
        break;
      }
    }
  }

  if (match && spiceAsset) {
    // clone since we're mutating the file list to be only the file that matches
    result = <ISpiceVersion>Object.assign({}, match);
    result.assets = [spiceAsset];
  }

  return result;
}

export async function getVersionsDist(
  dlUrl: string
): Promise<ISpiceVersion[] | null> {
  // this returns versions descending so latest is first
  let http: httpm.HttpClient = new httpm.HttpClient('setup-spice', [], {
    allowRedirects: true,
    maxRedirects: 3
  });
  return (await http.getJson<ISpiceVersion[]>(dlUrl)).result;
}

/*
 * Convert the go version syntax into semver for semver matching
 * 1.13.1 => 1.13.1
 * 1.13 => 1.13.0
 * 1.10beta1 => 1.10.0-beta1, 1.10rc1 => 1.10.0-rc1
 * 1.8.5beta1 => 1.8.5-beta1, 1.8.5rc1 => 1.8.5-rc1
 */
export function makeSemver(version: string): string {
  version = version.replace('spice', '');
  version = version.replace('beta', '-beta').replace('rc', '-rc');
  let parts = version.split('-');

  let verPart: string = parts[0];
  let prereleasePart = parts.length > 1 ? `-${parts[1]}` : '';

  let verParts: string[] = verPart.split('.');
  if (verParts.length == 2) verPart += '.0';

  return `${verPart}${prereleasePart}`;
}

export async function installRequirements() {
  const platFilter = sys.getPlatform();
  if (platFilter !== 'windows') {
    child_process.execSync(
      'sudo add-apt-repository ppa:ubuntu-toolchain-r/test'
    );
    child_process.execSync('sudo apt update && sudo apt install gcc-14 g++-14');
    child_process.execSync(
      'sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 110 --slave /usr/bin/g++ g++ /usr/bin/g++-14 --slave /usr/bin/gcov gcov /usr/bin/gcov-14 --slave /usr/bin/gcc-ar gcc-ar /usr/bin/gcc-ar-14 --slave /usr/bin/gcc-ranlib gcc-ranlib /usr/bin/gcc-ranlib-14'
    );
  }
  let gccVersion = child_process.execSync('gcc -v');
  core.info(`GCC version: ${gccVersion}`);
}
