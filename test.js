const { expect } = require('chai')
const supposed = require('supposed')
const { Topic } = require('./index')
const id = require('./src/id').factory()

module.exports = supposed.Suite({
  name: 'polyn-async-events',
  assertionLibrary: expect,
  inject: { Topic, id },
}).runner()
  .run()
