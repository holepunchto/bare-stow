const { registry } = require('./provider')

const transformer = registry('transform', {}, function validate(transform) {
  if (!transform || typeof transform.transform !== 'function') {
    throw new Error('Transform must provide a transform() function')
  }

  return transform
})

// Options are given by the name of the transform, so that each of several
// transforms gets its own.
module.exports = function resolve(transforms = [], given = {}, resolveTransform) {
  transforms = transforms.map((transform) => transformer(transform, resolveTransform))

  const names = new Set(transforms.map((transform) => transform.name))

  for (const name of Object.keys(given)) {
    if (!names.has(name)) throw new Error(`Options given for unknown transform '${name}'`)
  }

  return transforms.map((transform) => ({
    transform,
    options: options(transform, Object.hasOwn(given, transform.name) ? given[transform.name] : {})
  }))
}

function options(transform, given) {
  if (typeof given !== 'object' || given === null) {
    throw new Error(`Options for transform '${transform.name}' must be an object`)
  }

  if (typeof transform.options === 'function') return transform.options(given)

  for (const option of Object.keys(given)) {
    throw new Error(`Unknown option '${option}' for transform '${transform.name}'`)
  }

  return {}
}

// Transforms run before lowering, so that what they write is lowered too.
module.exports.apply = async function apply(transforms, bundle, context) {
  for (const { transform, options } of transforms) {
    bundle = await transform.transform(bundle, { ...context, transformOptions: options })
  }

  return bundle
}
