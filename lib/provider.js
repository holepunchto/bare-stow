exports.registry = function registry(kind, providers, validate) {
  return function provider(name, resolve) {
    if (typeof name !== 'string') return validate(name)

    const load = providers[name]

    if (load) return load()

    if (resolve) return validate(resolve(name))

    throw new Error(`Unknown ${kind} '${name}'`)
  }
}

exports.validateLanguages = function validateLanguages(kind, languages) {
  if (typeof languages !== 'object' || languages === null) {
    throw new Error(`${kind} must provide a languages object`)
  }

  for (const [name, entry] of Object.entries(languages)) {
    if (!entry || typeof entry.generate !== 'function') {
      throw new Error(`${kind} must provide a generate() function for language '${name}'`)
    }
  }
}

exports.select = function select(kind, provider, language) {
  if (!Object.hasOwn(provider.languages, language)) {
    throw new Error(`${kind} '${provider.name}' does not support language '${language}'`)
  }

  return provider.languages[language]
}
