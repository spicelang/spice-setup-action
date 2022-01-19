let os = require('os');

export function getPlatform(): string {
  // darwin and linux match already
  // freebsd not supported yet but future proofed.

  // 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', and 'win32'
  let plat: string = os.platform();

  // wants 'darwin', 'freebsd', 'linux', 'windows'
  if (plat === 'win32') return 'windows';
  return plat;
}

export function getArch(): string {
  // 'arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', and 'x64'.
  let arch: string = os.arch();

  // wants amd64, 386, arm64, armv61, ppc641e, s390x
  // currently not supported by runner but future proofed mapping
  switch (arch) {
    case 'x64':
      return 'amd64';
    case 'x32':
      return '386';
  }
  return arch;
}
