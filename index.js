const blueprint = require('@polyn/blueprint')
const immutable = require('@polyn/immutable')
const { allSettled } = require('./src/all-settled').factory()
const id = require('./src/id').factory()
const Publisher = require('./src/publish').factory(blueprint, immutable, id, allSettled)
const TopicMemoryRepo = require('./src/topic-memory-repo').factory(blueprint, immutable, id)
const { Topic } = require('./src/Topic').factory(blueprint, immutable, TopicMemoryRepo, Publisher)
const { WildcardEmitter } = require('./src/WildcardEmitter').factory(require('events'))

module.exports = { Topic, WildcardEmitter }
