<p align="center">
  <img alt="Spice Logo" src="https://github.com/spicelang/spice/raw/main/docs/docs/static/avatar.png" height="220" />
  <h3 align="center">Spice Programming Language</h3>
  <p align="center"><a href="https://github.com/features/actions" target="_blank">GitHub Action</a> to setup the Spice programming language on a runner instance.</p>
  <p align="center">
    <a target="_blank" href="https://github.com/spicelang/spice-setup-action/releases/latest"><img src="https://img.shields.io/github/v/release/spicelang/spice-setup-action?include_prereleases"></a>
    <a target="_blank" href="./.github/workflows/ci.yml"><img src="https://github.com/spicelang/spice-setup-action/actions/workflows/ci.yml/badge.svg"></a>
	<a target="_blank" href="./.github/workflows/codeql-analysis.yml"><img src="https://github.com/spicelang/spice-setup-action/actions/workflows/codeql-analysis.yml/badge.svg"></a>
    <a target="_blank" href="https://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
    <a target="_blank" href="./LICENSE.md"><img src="https://img.shields.io/github/license/spicelang/spice-setup-action"></a>
  </p>
</p>

---

This is the source code for the Spice Setup Action. This GH Action can be used to setup Spice on a CI runner instance.

## Usage
For detailed configuration information see the [action.yml](action.yml) file. Here are a few examples how to use it:

### Basic
```yml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Setup Spice
    uses: spicelang/spice-setup-action@v1
    with:
      spice-version: 0.22.0 # The Spice version to setup. If omitted, the latest version will be taken
      
  - run: spice run example.spice
```

### Matrix Testing
```yml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        spice: [ '0.22.0', '0.21.1' ]
    name: Setup Spice v${{ matrix.spice }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Spice v${{ matrix.spice }}
        uses: spicelang/spice-setup-action@v1
        with:
          spice-version: ${{ matrix.spice }}

      - run: spice run example.spice
```

## Contribute to the project
If you want to contribute to this project, please ensure you comply with the [contribution guidelines](./CONTRIBUTING.md).

© ChilliBits 2021-2025
