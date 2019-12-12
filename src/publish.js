module.exports = {
  name: 'publish',
  dependencies: ['@polyn/blueprint', '@polyn/immutable', 'id', 'allSettled'],
  factory: (polynBp, polynIm, id, allSettled) => (topic, repo) => {
    'use strict'

    const { is, required } = polynBp
    const { immutable } = polynIm
    const { makeComposite } = id
    const eventName = ({ value }) => typeof value === 'string' && value.toLowerCase().trim()

    const PublishOptions = immutable('PublishOptions', {
      name: required('string').from(eventName),
      body: 'any?',
    })

    /**
     * making an event is a composition of information that is gathered over
     * several steps:
     *  1. The topic, upon topic creation
     *  2. The name, when publish, or emit is called
     *  3. the id, and time, for each subscription that is being published
     * @param topic {string} - the topic that is being published to
     * @param eventName {string} - the name of the event being published
     * @param id {string} - the event id (a composite of the topic, event, and a unique identifier
     * @param time {number} - the time the event was published
     * @param meta {any?} - optional metadata to append to the event
     * @param subscription {Subscription} - the subscription being published to
     */
    const _makeMetaFactory = ((topic) => (eventName) => (id, time, meta) => (subscription) => {
      const metadata = { ...{ id, time, topic, event: eventName }, ...meta }

      if (subscription) {
        metadata.subscriptionId = subscription.id
      }

      return Object.freeze(metadata)
    })(topic)

    /**
     * Emits a topic event to all subscribers, and waits for each subscription
     * to complete before returning a response.
     * @param event {string} - the name of the event being published
     * @param body {any?} - the payload to send to subscribers, if applicable
     * @param meta {object?} - metadata to include with the event metadata
     * @returns {Promise<number>} - the number of subscriptions the topic was emitted to
     */
    const _publish = (event, body, meta) => {
      const { name } = new PublishOptions({ name: event, body })

      return repo.getSubscriptions(name)
        .then((_subscriptions) => {
          const id = makeComposite(topic, name)
          const time = Date.now()
          const makeMeta = _makeMetaFactory(name)(id, time, meta)

          const subscriptions = _subscriptions.map((subscription) => {
            try {
              const actual = subscription.receiver(body, makeMeta(subscription))
              return is.promise(actual) ? actual : Promise.resolve(actual)
            } catch (e) {
              return Promise.reject(e)
            }
          })

          return { subscriptions, makeMeta }
        })
    }

    /**
     * Emits a topic event to all subscribers, and waits for each subscription
     * to complete before returning a response.
     * @param event {string} - the name of the event being published
     * @param body {any?} - the payload to send to subscribers, if applicable
     * @param meta {object?} - metadata to include with the event metadata
     * @returns {Promise<number>} - the number of subscriptions the topic was emitted to
     */
    const publish = (event, body, meta) => _publish(event, body, meta)
      .then(({ subscriptions, makeMeta }) => {
        return allSettled(subscriptions).then((results) => {
          return {
            count: subscriptions.length,
            meta: makeMeta(),
            results,
          }
        })
      })

    /**
     * Emits a topic event to all subscribers. Does not wait for subscriptions to
     * complete before returning a response.
     * @param event {string} - the name of the event being published
     * @param body {any?} - the payload to send to subscribers, if applicable
     * @param meta {object?} - metadata to include with the event metadata
     * @returns {Promise<number>} - the number of subscriptions the topic was emitted to
     */
    const emit = (event, body, meta) => _publish(event, body, meta)
      .then(({ subscriptions, makeMeta }) => {
        allSettled(subscriptions).then((results) => {
          return {
            count: subscriptions.length,
            meta: makeMeta(),
            results,
          }
        })

        return { count: subscriptions.length, meta: makeMeta() }
      })

    return { publish, emit }
  },
}
