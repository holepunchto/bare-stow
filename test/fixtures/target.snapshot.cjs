/* eslint-disable */

exports['harness bare-sidecar - harness - 0'] = `const Sidecar = require('bare-sidecar')
const stow = require('bare-stow-host')

const bundle = require.resolve("./index.bundle")

module.exports = {
  async start({ timeout, grace, ...opts } = {}) {
    const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

    const ipc = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

    sidecar.on('exit', (code, signal) => ipc.exited(code, signal))

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness bare-sidecar - types - 0'] = `export function start(
  opts?: import('bare-sidecar').SidecarOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'>
): Promise<{ ipc: import('bare-stow-host').IPC }>
`

exports['harness bare-sidecar with client - harness - 0'] = `const Sidecar = require('bare-sidecar')
const stow = require('bare-stow-host')
const client = require("./core.client.js")

const bundle = require.resolve("./index.bundle")

module.exports = {
  async start({ timeout, grace, handlers = () => {}, ...opts } = {}) {
    const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

    const ipc = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

    sidecar.on('exit', (code, signal) => ipc.exited(code, signal))

    const rpc = client.attach(ipc, handlers)

    await ipc.ready

    return { ipc, rpc }
  }
}
`

exports['harness bare-sidecar with client - types - 0'] = `export function start(
  opts?: import('bare-sidecar').SidecarOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'> & { handlers?: import("./core.client.js").Handlers }
): Promise<{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import("./core.client.js").attach> }>
`

exports['harness bare-sidecar as esm - harness - 0'] = `import Sidecar from 'bare-sidecar'
import stow from 'bare-stow-host'

const bundle = new URL(import.meta.resolve("./index.bundle"))

export async function start({ timeout, grace, ...opts } = {}) {
  const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

  const ipc = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

  sidecar.on('exit', (code, signal) => ipc.exited(code, signal))

  await ipc.ready

  return { ipc }
}
`

exports['harness bare-sidecar as esm - types - 0'] = `export function start(
  opts?: import('bare-sidecar').SidecarOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'>
): Promise<{ ipc: import('bare-stow-host').IPC }>
`

exports['harness bare-sidecar as esm with client - harness - 0'] =
  `import Sidecar from 'bare-sidecar'
import stow from 'bare-stow-host'
import * as client from "./core.client.mjs"

const bundle = new URL(import.meta.resolve("./index.bundle"))

export async function start({ timeout, grace, handlers = () => {}, ...opts } = {}) {
  const sidecar = new Sidecar(bundle, { stdio: 'inherit', ...opts })

  const ipc = stow.wrap(sidecar, { kill: () => sidecar.kill('SIGKILL'), timeout, grace })

  sidecar.on('exit', (code, signal) => ipc.exited(code, signal))

  const rpc = client.attach(ipc, handlers)

  await ipc.ready

  return { ipc, rpc }
}
`

exports['harness bare-sidecar as esm with client - types - 0'] = `export function start(
  opts?: import('bare-sidecar').SidecarOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'> & { handlers?: import("./core.client.mjs").Handlers }
): Promise<{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import("./core.client.mjs").attach> }>
`

exports['harness bare-worker - harness - 0'] = `const Worker = require('bare-worker')
const stow = require('bare-stow-host')

const bundle = require.resolve("./index.bundle")

module.exports = {
  async start({ timeout, grace, ...opts } = {}) {
    const worker = new Worker(bundle, opts)

    const ipc = stow.wrap(worker.IPC, { kill: () => worker.terminate(), timeout, grace })

    worker.IPC.on('end', () => worker.IPC.destroy())

    worker.on('exit', (code) => ipc.exited(code))

    await ipc.ready

    return { ipc }
  }
}
`

exports['harness bare-worker - types - 0'] = `export function start(
  opts?: import('bare-worker').WorkerOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'>
): Promise<{ ipc: import('bare-stow-host').IPC }>
`

exports['harness bare-worker with client - harness - 0'] = `const Worker = require('bare-worker')
const stow = require('bare-stow-host')
const client = require("./core.client.js")

const bundle = require.resolve("./index.bundle")

module.exports = {
  async start({ timeout, grace, handlers = () => {}, ...opts } = {}) {
    const worker = new Worker(bundle, opts)

    const ipc = stow.wrap(worker.IPC, { kill: () => worker.terminate(), timeout, grace })

    worker.IPC.on('end', () => worker.IPC.destroy())

    worker.on('exit', (code) => ipc.exited(code))

    const rpc = client.attach(ipc, handlers)

    await ipc.ready

    return { ipc, rpc }
  }
}
`

exports['harness bare-worker with client - types - 0'] = `export function start(
  opts?: import('bare-worker').WorkerOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'> & { handlers?: import("./core.client.js").Handlers }
): Promise<{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import("./core.client.js").attach> }>
`

exports['harness bare-worker as esm - harness - 0'] = `import Worker from 'bare-worker'
import stow from 'bare-stow-host'

const bundle = import.meta.resolve("./index.bundle")

export async function start({ timeout, grace, ...opts } = {}) {
  const worker = new Worker(bundle, opts)

  const ipc = stow.wrap(worker.IPC, { kill: () => worker.terminate(), timeout, grace })

  worker.IPC.on('end', () => worker.IPC.destroy())

  worker.on('exit', (code) => ipc.exited(code))

  await ipc.ready

  return { ipc }
}
`

exports['harness bare-worker as esm - types - 0'] = `export function start(
  opts?: import('bare-worker').WorkerOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'>
): Promise<{ ipc: import('bare-stow-host').IPC }>
`

exports['harness bare-worker as esm with client - harness - 0'] = `import Worker from 'bare-worker'
import stow from 'bare-stow-host'
import * as client from "./core.client.mjs"

const bundle = import.meta.resolve("./index.bundle")

export async function start({ timeout, grace, handlers = () => {}, ...opts } = {}) {
  const worker = new Worker(bundle, opts)

  const ipc = stow.wrap(worker.IPC, { kill: () => worker.terminate(), timeout, grace })

  worker.IPC.on('end', () => worker.IPC.destroy())

  worker.on('exit', (code) => ipc.exited(code))

  const rpc = client.attach(ipc, handlers)

  await ipc.ready

  return { ipc, rpc }
}
`

exports['harness bare-worker as esm with client - types - 0'] = `export function start(
  opts?: import('bare-worker').WorkerOptions & Omit<import('bare-stow-host').IPCOptions, 'kill'> & { handlers?: import("./core.client.mjs").Handlers }
): Promise<{ ipc: import('bare-stow-host').IPC; rpc: ReturnType<typeof import("./core.client.mjs").attach> }>
`

exports['harness bare-sidecar as python - harness - 0'] = `import asyncio
from pathlib import Path
from typing import NamedTuple

from bare_sidecar import spawn
from bare_stow_host import DEFAULT_GRACE, IPC, wrap

bundle = Path(__file__).parent / "index.bundle"

_watching = set()


class Started(NamedTuple):
    ipc: IPC


async def start(
    *,
    timeout=None,
    grace=DEFAULT_GRACE,
    **opts,
) -> Started:
    sidecar = await spawn(bundle, **opts)

    ipc = wrap(sidecar, kill=sidecar.kill, timeout=timeout, grace=grace)

    watching = asyncio.ensure_future(_watch(sidecar, ipc))
    _watching.add(watching)
    watching.add_done_callback(_watching.discard)

    await ipc.ready

    return Started(ipc)


async def _watch(sidecar, ipc):
    await sidecar.wait()

    ipc.exited(sidecar.exit_code, sidecar.signal_code)

    await sidecar.close()
`

exports['harness bare-sidecar as python with client - harness - 0'] = `import asyncio
from pathlib import Path
from typing import NamedTuple

from bare_sidecar import spawn
from bare_stow_host import DEFAULT_GRACE, IPC, wrap

from .client import Client, Handlers, attach

bundle = Path(__file__).parent / "index.bundle"

_watching = set()


class Started(NamedTuple):
    ipc: IPC
    rpc: Client


async def start(
    *,
    timeout=None,
    grace=DEFAULT_GRACE,
    handlers: Handlers = lambda router: None,
    **opts,
) -> Started:
    sidecar = await spawn(bundle, **opts)

    ipc = wrap(sidecar, kill=sidecar.kill, timeout=timeout, grace=grace)

    watching = asyncio.ensure_future(_watch(sidecar, ipc))
    _watching.add(watching)
    watching.add_done_callback(_watching.discard)

    rpc = attach(ipc, handlers)

    await ipc.ready

    return Started(ipc, rpc)


async def _watch(sidecar, ipc):
    await sidecar.wait()

    ipc.exited(sidecar.exit_code, sidecar.signal_code)

    await sidecar.close()
`

exports['harness bare-sidecar as swift - harness - 0'] = `import BareSidecar
import BareStowHost
import Foundation

extension Sidecar: @retroactive Transport {}

public struct Started: Sendable {
  public let ipc: BareStowHost.IPC
}

public func start(
  timeout: TimeInterval? = nil,
  grace: TimeInterval = BareStowHost.IPC.defaultGrace
) async throws -> Started {
  let bundle = Bundle.module.url(forResource: "index.bundle", withExtension: nil)!

  let sidecar = try await Sidecar.spawn(bundle)

  let ipc = BareStowHost.IPC(sidecar, kill: { sidecar.kill() }, timeout: timeout, grace: grace)

  Task {
    switch await sidecar.wait() {
    case .exit(let code): ipc.exited(code: code)
    case .signal(let signal): ipc.exited(code: nil, signal: signal)
    }
  }

  try await ipc.ready()

  return Started(ipc: ipc)
}
`

exports['harness bare-sidecar as swift with client - harness - 0'] = `import BareSidecar
import BareStowHost
import Foundation

extension Sidecar: @retroactive Transport {}

public struct Started: Sendable {
  public let ipc: BareStowHost.IPC
  public let rpc: Client
}

public func start(
  timeout: TimeInterval? = nil,
  grace: TimeInterval = BareStowHost.IPC.defaultGrace,
  handlers: Handlers? = nil
) async throws -> Started {
  let bundle = Bundle.module.url(forResource: "index.bundle", withExtension: nil)!

  let sidecar = try await Sidecar.spawn(bundle)

  let ipc = BareStowHost.IPC(sidecar, kill: { sidecar.kill() }, timeout: timeout, grace: grace)

  Task {
    switch await sidecar.wait() {
    case .exit(let code): ipc.exited(code: code)
    case .signal(let signal): ipc.exited(code: nil, signal: signal)
    }
  }

  let rpc = attach(ipc, handlers)

  try await ipc.ready()

  return Started(ipc: ipc, rpc: rpc)
}
`

exports['harness bare-kit as swift - harness - 0'] = `import BareKit
import BareStowHost
import Foundation

extension BareKit.IPC: @retroactive Transport {}

public struct Started: Sendable {
  public let worklet: Worklet
  public let ipc: BareStowHost.IPC
}

public func start(
  options: Worklet.Options = Worklet.Options(),
  timeout: TimeInterval? = nil,
  grace: TimeInterval = BareStowHost.IPC.defaultGrace
) async throws -> Started {
  let bundle = Bundle.module.url(forResource: "index.bundle", withExtension: nil)!

  let worklet = try Worklet(options: options)

  let transport = try BareKit.IPC(worklet: worklet)

  try worklet.start(bundle)

  let ipc = BareStowHost.IPC(
    transport, kill: { worklet.terminate() }, timeout: timeout, grace: grace)

  Task { ipc.exited(code: await worklet.wait()) }

  try await ipc.ready()

  return Started(worklet: worklet, ipc: ipc)
}
`

exports['harness bare-kit as swift with client - harness - 0'] = `import BareKit
import BareStowHost
import Foundation

extension BareKit.IPC: @retroactive Transport {}

public struct Started: Sendable {
  public let worklet: Worklet
  public let ipc: BareStowHost.IPC
  public let rpc: Client
}

public func start(
  options: Worklet.Options = Worklet.Options(),
  timeout: TimeInterval? = nil,
  grace: TimeInterval = BareStowHost.IPC.defaultGrace,
  handlers: Handlers? = nil
) async throws -> Started {
  let bundle = Bundle.module.url(forResource: "index.bundle", withExtension: nil)!

  let worklet = try Worklet(options: options)

  let transport = try BareKit.IPC(worklet: worklet)

  try worklet.start(bundle)

  let ipc = BareStowHost.IPC(
    transport, kill: { worklet.terminate() }, timeout: timeout, grace: grace)

  Task { ipc.exited(code: await worklet.wait()) }

  let rpc = attach(ipc, handlers)

  try await ipc.ready()

  return Started(worklet: worklet, ipc: ipc, rpc: rpc)
}
`

exports['harness bare-kit as kotlin - harness - 0'] = `package com.example.core

import android.content.Context
import kotlin.time.Duration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import to.holepunch.bare.kit.Ipc as WorkletIpc
import to.holepunch.bare.kit.Worklet
import to.holepunch.bare.stow.host.Ipc

class Started(val worklet: Worklet, val ipc: Ipc)

suspend fun start(
  context: Context,
  options: Worklet.Options = Worklet.Options(),
  timeout: Duration? = null,
  grace: Duration = Ipc.DEFAULT_GRACE,
): Started {
  val worklet = Worklet(context, options)

  val transport = WorkletIpc(worklet)

  worklet.start("com/example/core/index.bundle")

  val ipc =
    Ipc(
      transport.data,
      transport::write,
      kill = { worklet.terminate() },
      timeout = timeout,
      grace = grace,
    )

  CoroutineScope(Dispatchers.Default).launch {
    ipc.exited(worklet.wait())

    transport.close()
  }

  ipc.ready()

  return Started(worklet, ipc)
}
`

/* eslint-enable */
