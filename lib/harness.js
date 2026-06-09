const targets = {
  'react-native': require('./harness/react-native'),
  'pear-runtime': require('./harness/pear-runtime'),
  node: require('./harness/node')
}

module.exports = function harness(target) {
  const t = targets[target]

  if (!t) throw new Error(`Unknown target '${target}'`)

  return t
}
