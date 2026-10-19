const os = require('bare-os')
const harness = require(Bare.argv[2])

const crash = Bare.argv[3] === 'crash'

harness.start({ grace: 100 }).then(() => {
  // Exiting reaps the sidecar with SIGTERM on teardown, while crashing leaves
  // it orphaned.
  if (crash) os.kill(Bare.pid, 'SIGKILL')
  else Bare.exit(0)
})
