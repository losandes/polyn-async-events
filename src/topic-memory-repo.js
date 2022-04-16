/**
 * An in-memory repository for topic subscriptions
 */
module.exports = {
  name: 'topic-memory-repo',
  dependencies: ['@polyn/blueprint', '@polyn/immutable', 'id'],
  factory: (polynBp, polynIm, id) => (topic) => {
    'use strict'

    const { required } = polynBp
    const { immutable } = polynIm
    const { makeComposite } = id
    const parseComposite = (_id) => {
      const parsed = id.parseComposite(_id)

      return {
        topic: parsed[0],
        event: parsed[1],
        id: parsed[2],
      }
    }

    const eventName = ({ value }) => typeof value === 'string' && value.toLowerCase().trim()

    const SubscriptionOptions = immutable('SubscriptionOptions', {
      names: required('string[]').from(({ value }) => {
        if (typeof value === 'string') {
          return [eventName({ value })]
        } else if (Array.isArray(value)) {
          return value.map((name) => eventName({ value: name }))
        }
      }),
      receiver: 'function',
    })

    const CancellationOptions = immutable('CancellationOptions', {
      id: required('string').from(eventName),
      name: required('string').from(({ output }) => parseComposite(output.id).event),
    })

    const GetSubscriptionOptions = immutable('GetSubscriptionOptions', {
      name: required('string').from(eventName),
    })

    const subscriptions = {}

    const subscribeOne = (name, receiver) => {
      if (!subscriptions[name]) {
        // this is the first subscriber to this event: initialize it
        subscriptions[name] = { receivers: [] }
      }

      const subscription = {
        id: makeComposite(topic, name),
        receiver: receiver,
      }

      subscriptions[name].receivers.push(subscription)

      return { subscriptionId: subscription.id }
    }

    /**
     * Initializes the topic's event, if it doesn't exist, and adds a subscription to
     * that event
     * @param {string|string[]} name - the name(s) of the event(s)
     * @param {function} receiver - the handler/callback that will be called when that event is published
     * @returns {Promise<string|string[]>} - an id per name, which can be used to unsubscribe
     */
    const subscribe = (names, receiver) => new Promise((resolve, reject) => {
      try {
        const options = new SubscriptionOptions({ names, receiver })
        const ids = options.names.map((name) => subscribeOne(name, receiver))

        resolve(typeof names === 'string' ? ids[0] : ids)
      } catch (e) {
        reject(e)
      }
    })

    /**
     * Removes a subscription from a topic event, by id (the string returned by the
     * `subscribe` function)
     * @param {string} id - the id of the subscription to remove
     * @returns {Promise<boolean>} - whether or not the subscriber was removed
     */
    const unsubscribe = (id) => new Promise((resolve, reject) => {
      try {
        const options = new CancellationOptions({ id })

        for (let i = 0; i < subscriptions[options.name].receivers.length; i += 1) {
          if (subscriptions[options.name].receivers[i].id === options.id) {
            subscriptions[options.name].receivers.splice(i, 1)
            return resolve(true)
          }
        }

        resolve(false)
      } catch (e) {
        reject(e)
      }
    })

    /**
     * Gets subscriptions by topic name
     * @param {string} name - the name of the topic to get subscriptions for
     * @returns {Promise<{id: string, receiver: function}[]>} - the receivers that are registered for the topic
     */
    const getSubscriptions = (name) => new Promise((resolve, reject) => {
      try {
        const options = new GetSubscriptionOptions({ name })
        const found = subscriptions[options.name] || { receivers: [] }
        resolve(found.receivers)
      } catch (e) {
        reject(e)
      }
    })

    /**
     * Checks whether a topic has any subscriptions
     * @param {string} name - the name of the topic to check
     * @returns {Promise<boolean>} - whether or not the topic has any subscriptions
     */
    const hasSubscriptions = (name) => new Promise((resolve, reject) => {
      try {
        const options = new GetSubscriptionOptions({ name })
        resolve(subscriptions[options.name] && subscriptions[options.name].receivers.length)
      } catch (e) {
        reject(e)
      }
    })

    return {
      subscribe,
      unsubscribe,
      getSubscriptions,
      hasSubscriptions,
    }
  },
}
