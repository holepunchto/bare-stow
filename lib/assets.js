const unpack = require('bare-unpack')
const fs = require('./fs')

// The assets of bundles linked by the application share one directory, named
// after the bundle that Bare Kit starts them as.
exports.app = 'bare-stow'

// Assets are laid out the way Bare Kit expects: the assets of `<name>.bundle`
// live in `<name>/`, listed in `<name>.assets` for platforms that extract them.
exports.unpack = async function (bundle, base, name) {
  const assets = []

  bundle = await unpack(bundle, { files: false, assets: true }, async (key) => {
    const relative = await exports.path(new URL('.' + key, base))

    assets.push({ path: relative, source: bundle.read(key) })

    return '/../' + name + '/' + relative
  })

  return { bundle, assets }
}

// Assets of dependencies keep their path from `node_modules`, and others their
// path within their package, so that every bundle places an asset alike.
exports.path = async function (url) {
  const nm = url.pathname.indexOf('/node_modules/')

  if (nm >= 0) return url.pathname.slice(nm + 1)

  for (let dir = new URL('./', url); ; dir = new URL('../', dir)) {
    if (await fs.isFile(new URL('package.json', dir))) {
      return url.pathname.slice(dir.pathname.length)
    }

    if (dir.pathname === '/') throw new Error(`Asset '${url.href}' is not part of a package`)
  }
}

exports.write = async function* (dir, name, assets) {
  assets = [...assets].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  for (const asset of assets) {
    const url = new URL(name + '/' + asset.path, dir)

    await fs.writeFile(url, asset.source)
    yield url
  }

  const listing = new URL(name + '.assets', dir)

  await fs.writeFile(listing, assets.map((asset) => '/' + asset.path + '\n').join(''))
  yield listing
}
