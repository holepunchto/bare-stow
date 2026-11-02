const { registry } = require('./provider')

const providers = {
  javascript: () => require('./language/javascript'),
  kotlin: () => require('./language/kotlin'),
  python: () => require('./language/python'),
  swift: () => require('./language/swift')
}

module.exports = registry('language', providers, function validate(language) {
  for (const method of ['options', 'layout', 'sibling', 'reference', 'manifest']) {
    if (typeof language?.[method] !== 'function') {
      throw new Error(`Language must provide a ${method}() function`)
    }
  }

  return language
})
