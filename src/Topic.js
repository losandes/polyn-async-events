module.exports = {
  name: 'Topic',
  dependencies: ['@polyn/blueprint', '@polyn/immutable', 'TopicMemoryRepo', 'publisher'],
  factory: (polynBp, polynIm, TopicMemoryRepo, Publisher) => {
    'use strict'

    const { optional, registerBlueprint } = polynBp
    const { immutable } = polynIm

    /**
     * The repository used to manage topic subscriptions
     * @typedef {Object} TopicRepo
     * @property {(name: string|string[], receiver: Function):Promise<string|string[]>} subscribe - initializes the topic's event, if it doesn't exist, and adds a subscription to that event
     * @property {(id: string): Promise<boolean>} unsubscribe - removes a subscription from a topic event, by id (the string returned by the `subscribe` function)
     * @property {(name: string): Promise<{id: string, receiver: function}[]>} getSubscriptions - gets subscriptions by topic name
     * @property {(name: string): Promise<boolean>} hasSubscriptions - checks whether a topic has any subscriptions
     */

    /**
     * The options for the topic and the default options for publishing,
     * emitting, or delivering events
     * @typedef {Object} TopicOptions
     * @property {string} topic - the name of the topic that events will be published, emitted, or delivered to
     * @property {TopicRepo?} repo - a repository used to manage topic subscriptions
     * @property {(^(all|errors|none)$)?} reportVerbosity - whether to report all outcomes, errors, or nothing (default is 'errors')
     * @property {number?} timeout - the amount of time allowed to ellapse before rejecting a delivery acknowledgement
     */

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
      reportVerbosity: optional(/^(all|errors|none)$/).withDefault('errors'),
      reportEventNames: {
        fulfilled: optional('string').withDefault('fulfilled'),
        rejected: optional('string').withDefault('error'),
      },
    })

    /**
     * Creates a new topic for publishing, emitting, or delivering events
     * @param {TopicOptions} topicOptions - the options for the topic and the default options for publishing, emitting, or delivering events
     */
    function Topic (topicOptions) {
      const options = new TopicOptions(topicOptions)

      const repo = options.repo || TopicMemoryRepo(options.topic)
      const { publish, emit, deliver } = Publisher(options, repo)

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
