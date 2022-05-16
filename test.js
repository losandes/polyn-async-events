const { expect } = require('chai')
const supposed = require('supposed')
const { allSettled } = require('./src/all-settled').factory()
const { Topic, WildcardEmitter } = require('./index')
const id = require('./src/id').factory()

module.exports = supposed.Suite({
  name: 'polyn-async-events',
  assertionLibrary: expect,
  inject: { allSettled, Topic, id, WildcardEmitter },
}).runner()
  .run()
