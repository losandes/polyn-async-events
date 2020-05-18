const { expect } = require('chai')
const supposed = require('supposed')
const { Topic, WildcardEmitter } = require('./index')
const id = require('./src/id').factory()

module.exports = supposed.Suite({
  name: 'polyn-async-events',
  assertionLibrary: expect,
  inject: { Topic, id, WildcardEmitter },
}).runner()
  .run()
