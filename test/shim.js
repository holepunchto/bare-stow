const test = require('brittle')
const { isWindows } = require('which-runtime')
const shim = require('../lib/shim')
const rpcs = require('../lib/rpc')

const root = isWindows ? 'file://c:' : 'file://'

const entry = new URL(`${root}/app/entry.js`)

test('shim', (t) => {
  const { url, modules } = shim(entry, 'process')

  t.is(url.href, new URL('__main__.mjs', entry).href)
  t.is(modules.size, 1)
  t.snapshot(modules.get(url.href))
})

test('shim in a thread', (t) => {
  const { url, modules } = shim(entry, 'thread')

  t.ok(modules.get(url.href).includes("import runtime from 'bare-stow-runtime'\n"))
})

test('shim with server', (t) => {
  const { url, modules } = shim(entry, 'process', rpcs('bare-rpc'))

  t.snapshot(modules.get(url.href), 'main')
  t.snapshot(modules.get(new URL('__server__.mjs', entry).href), 'server')
})
