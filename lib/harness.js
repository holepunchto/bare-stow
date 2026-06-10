module.exports = function harness(target) {
  switch (target) {
    case 'react-native':
      return require('./harness/react-native')
    case 'pear-runtime':
      return require('./harness/pear-runtime')
    case 'node':
      return require('./harness/node')
    default:
      throw new Error(`Unknown target '${target}'`)
  }
}
