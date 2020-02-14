module.exports = {
  name: 'Topic',
  dependencies: ['@polyn/blueprint', '@polyn/immutable', 'TopicMemoryRepo', 'publisher'],
  factory: (polynBp, polynIm, TopicMemoryRepo, Publisher) => {
    'use strict'

    const { optional, registerBlueprint } = polynBp
    const { immutable } = polynIm

    registerBlueprint('TopicRepo', {
      subscribe: 'promise',
      unsubscribe: 'promise',
      getSubscriptions: 'promise',
      hasSubscriptions: 'promise',
    })

    const TopicOptions = immutable('TopicOptions', {
      topic: 'string',
      repo: 'TopicRepo?',
      timeout: optional('number').withDefault(3000),
    })

    function Topic (pubsubOptions) {
      const options = new TopicOptions(pubsubOptions)

      const repo = options.repo || TopicMemoryRepo(options.topic)
      const { publish, emit, deliver } = Publisher(options.topic, repo, options.timeout)

      return {
        name: options.topic,
        publish,
        emit,
        deliver,
        subscribe: repo.subscribe,
        unsubscribe: repo.unsubscribe,
        // below are undocumented and subject to change or deprecation
        // use at your own risk
        getSubscriptions: repo.getSubscriptions,
        hasSubscriptions: repo.hasSubscriptions,
      }
    }

    return { Topic }
  },
}
