import * as core from '@actions/core';
import * as io from '@actions/io';
import * as installer from './installer';
import path from 'path';
import cp from 'child_process';
import {URL} from 'url';

const defaultVersion: string = '0.18';

export async function run() {
  try {
    /*
     * versionSpec is optional.  If supplied, install / use from the tool cache
     * If not supplied then problem matchers will still be setup. Useful for self-hosted.
     */
    let versionSpec = core.getInput('spice-version');
    if (!versionSpec) versionSpec = defaultVersion;

    /*
     * stable will be true unless false is the exact input
     * since getting unstable versions should be explicit
     */
    let stable = (core.getInput('stable') || 'true').toLowerCase() === 'true';

    /*
     * drafts will be false unless true is the exact input
     * since getting draft versions should be explicit
     */
    let drafts = (core.getInput('drafts') || 'false').toLowerCase() === 'true';

    core.info('Setup a matching GCC version');
    await installer.installRequirements();

    core.info(
      `Setup Spice ${stable ? 'stable' : ''} version spec ${versionSpec}`
    );

    if (versionSpec) {
      let token = core.getInput('token');
      let auth = !token || isGhes() ? undefined : `token ${token}`;

      const installDir = await installer.getSpice(
        versionSpec,
        stable,
        drafts,
        auth
      );

      core.addPath(installDir);
      core.info('Added Spice to the path');

      let stdPath = path.join(installDir, 'std');
      core.exportVariable('SPICE_STD_DIR', stdPath);
      core.info(`Env var SPICE_STD_DIR is set to: ${stdPath}`);

      core.info(`Successfully setup Spice version ${versionSpec}`);
    }

    // output the version actually being used
    let spicePath = await io.which('spice');
    let spiceVersion = (cp.execSync(`${spicePath} --version`) || '').toString();
    core.info(spiceVersion);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toLowerCase() !== 'github.com';
}
