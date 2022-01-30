import * as core from '@actions/core';
import * as io from '@actions/io';
import * as installer from './installer';
import path from 'path';
import cp from 'child_process';
import fs from 'fs';
import {URL} from 'url';

export async function run() {
  try {
    /*
     * versionSpec is optional.  If supplied, install / use from the tool cache
     * If not supplied then problem matchers will still be setup. Useful for self-hosted.
     */
    let versionSpec = core.getInput('spice-version');

    /*
     *stable will be true unless false is the exact input
     * since getting unstable versions should be explicit
     */
    let stable = (core.getInput('stable') || 'true').toLowerCase() === 'true';

    core.info(
      `Setup Spice ${stable ? 'stable' : ''} version spec ${versionSpec}`
    );

    if (versionSpec) {
      let token = core.getInput('token');
      let auth = !token || isGhes() ? undefined : `token ${token}`;

      const installDir = await installer.getSpice(versionSpec, stable, auth);

      core.exportVariable('GOROOT', installDir);
      core.addPath(path.join(installDir, 'bin'));
      core.info('Added go to the path');

      let added = await addBinToPath();
      core.debug(`add bin ${added}`);
      core.info(`Successfully setup Spice version ${versionSpec}`);
    }

    // add problem matchers
    const matchersPath = path.join(__dirname, '..', 'matchers.json');
    core.info(`##[add-matcher]${matchersPath}`);

    // output the version actually being used
    let spicePath = await io.which('spice');
    let goVersion = (cp.execSync(`${spicePath} version`) || '').toString();
    core.info(goVersion);

    core.startGroup('go env');
    let goEnv = (cp.execSync(`${spicePath} env`) || '').toString();
    core.info(goEnv);
    core.endGroup();
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

export async function addBinToPath(): Promise<boolean> {
  let added = false;
  let s = await io.which('spice');
  core.debug(`which spice :${s}:`);
  if (!s) {
    core.debug('Spice not in the path');
    return added;
  }

  let buf = cp.execSync('spice env GOPATH');
  if (buf) {
    let gp = buf.toString().trim();
    core.debug(`spice env GOPATH :${gp}:`);
    if (!fs.existsSync(gp)) {
      // some of the hosted images have go install but not profile dir
      core.debug(`creating ${gp}`);
      io.mkdirP(gp);
    }

    let bp = path.join(gp, 'bin');
    if (!fs.existsSync(bp)) {
      core.debug(`creating ${bp}`);
      io.mkdirP(bp);
    }

    core.addPath(bp);
    added = true;
  }
  return added;
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toLowerCase() !== 'github.com';
}
