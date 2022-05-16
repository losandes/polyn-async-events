module.exports = {
  name: 'publish',
  dependencies: ['@polyn/blueprint', '@polyn/immutable', 'id', 'allSettled'],
  factory: (polynBp, polynIm, id, allSettled) => (topicOptions, repo) => {
    'use strict'

    const { is, optional, required } = polynBp
    const { immutable } = polynIm
    const { makeComposite } = id
    const { topic } = topicOptions

    /**
     * The outcome of settling all subscriptions for an event that was published,
     * emitted, or delivered
     * @typedef {Object} ShippingResult
     * @property {Promise<any?>} subscriptions - the results of the subscriptions that were emitted to
     * @property {Function} makeMeta - a function that will produce metadata for the event that was published, emitted, or delivered
     */
    /**
     * The outcome of publishing, emitting, or delivering events
     * @typedef {Object} EmissionResult
     * @property {number} count - the number of subscribers emitted to
     * @property {any} meta - the metadata about the events that were emitted
     * @property {object[]?} results - the outcomes of the emissions
     */

    /**
     * The options for publishing an event
     * @typedef {Object} PublishOptions
     * @property {string} name - the name of the event
     * @property {any?} body - the information to emit, publish, or deliver
     * @property {any?} meta - additional context or emission options to be attached to the event
     * @property {(^(all|errors|none)$)?} reportVerbosity - whether to report all outcomes, errors, or nothing (default is 'errors')
     * @property {number?} timeout - the amount of time allowed to ellapse before rejecting a delivery acknowledgement
     */
    const PublishOptions = immutable('PublishOptions', {
      name: required('string').from(
        ({ value }) => typeof value === 'string' && value.toLowerCase().trim(),
      ),
      body: 'any?',
      meta: optional('any').withDefault({}),
      reportVerbosity: required(/^(all|errors|none)$/).from(({ output }) =>
        output.meta.reportVerbosity || topicOptions.reportVerbosity // eslint-disable-line comma-dangle
      ),
      timeout: optional('number').withDefault(topicOptions.timeout),
    })

    /**
     * making an event is a composition of information that is gathered over
     * several steps:
     *  1. The topic, upon topic creation
     *  2. The name, when publish, or emit is called
     *  3. the id, and time, for each subscription that is being published
     * @curried
     * @param {string} topic - the topic that is being published to
     * @param {string} eventName - the name of the event being published
     * @param {string} id - the event id (a composite of the topic, event, and a unique identifier
     * @param {number} time - the time the event was published
     * @param {any?} meta - optional metadata to append to the event
     * @param {Subscription} subscription - the subscription being published to
     */
    const makeMetaFactory = ((topic) => (eventName) => (id, time, meta) => (subscription) => {
      const metadata = { ...{ id, time, topic, event: eventName }, ...meta }

      if (subscription) {
        metadata.subscriptionId = subscription.id
      }

      return Object.freeze(metadata)
    })(topic)

    /**
     * Emits a topic event to all subscribers, and returns the promises for each emission
     * @param {PublishOptions} publishOptions - the options for publishing an event
     * @returns {ShippingResult} - The outcome of settling all subscriptions for an event that was published, emitted, or delivered
     */
    const shipToSubscribers = (publishOptions) => {
      const { name, body, meta } = publishOptions

      return repo.getSubscriptions(name)
        .then((_subscriptions) => {
          const id = makeComposite(topic, name)
          const time = Date.now()
          const makeMeta = makeMetaFactory(name)(id, time, meta)

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
     * Emits to all subscribers, a topic event with delivery request receipt
     * requests (ack), and returns the promises for each emission
     * @param {PublishOptions} publishOptions - the options for publishing an event
     * @returns {ShippingResult} - The outcome of settling all subscriptions for an event that was published, emitted, or delivered
     */
    shipToSubscribers.withAckRequests = (publishOptions) => {
      const { name, body, meta, timeout } = publishOptions

      return repo.getSubscriptions(name)
        .then((_subscriptions) => {
          const id = makeComposite(topic, name)
          const time = Date.now()
          const makeMeta = makeMetaFactory(name)(id, time, meta)

          const subscriptions = _subscriptions.map((subscription) =>
            new Promise((resolve, reject) => {
              const to = setTimeout(() => {
                reject(new Error('Delivery timed out'))
              }, timeout)

              const ack = (err, res) => {
                clearTimeout(to)
                if (err) {
                  reject(err)
                }
                resolve(res)
              }

              try {
                const actual = subscription.receiver(body, makeMeta(subscription), ack)
                const actualPromise = is.promise(actual) ? actual : Promise.resolve(actual)
                actualPromise.catch(ack)
              } catch (e) {
                ack(e)
              }
            }),
          )

          return { subscriptions, makeMeta }
        })
    }

    /**
     * Emits the results of shipping to subscribers.
     * @curried
     * @param {PublishOptions} publishOptions - the options for publishing an event
     * @param {ShippingResult} results - the output from allSettled
     * @returns {ShippingResult} - (pass-through) The outcome of settling all subscriptions for an event that was published, emitted, or delivered
     */
    const maybeReport = (publishOptions) => (results) => {
      const { meta, reportVerbosity } = publishOptions

      if (reportVerbosity === 'none') {
        // we are either in recursion and want to avoid an infinite loop
        // or the caller doesn't want reporting
        return results
      }

      results.forEach((result) => {
        if (reportVerbosity === 'all' && result.status === 'fulfilled') {
          emit(topicOptions.reportEventNames.fulfilled, result.value, { ...meta, ...{ reportVerbosity: 'none' } })
        } else if (result.status === 'rejected') {
          emit(topicOptions.reportEventNames.rejected, result.reason, { ...meta, ...{ reportVerbosity: 'none' } })
        }
      })

      return results
    }

    /**
     * Emits a topic event to all subscribers, and waits for each subscription
     * to complete before returning a response.
     * @param {string} event - the name of the event being published
     * @param {any?} body - the payload to send to subscribers, if applicable
     * @param {object?} meta - metadata to include with the event metadata
     * @param {(^(all|errors|none)$)?} meta.reportVerbosity - whether to report all outcomes, errors, or nothing
     * @returns {EmissionResult} - The outcome of publishing, emitting, or delivering events
     */
    const publish = (event, body, meta) => {
      const publishOptions = new PublishOptions({ name: event, body, meta })

      return shipToSubscribers(publishOptions).then(({ subscriptions, makeMeta }) =>
        allSettled(subscriptions)
          .then(maybeReport(publishOptions))
          .then((results) => {
            return {
              count: subscriptions.length,
              meta: makeMeta(),
              results,
            }
          }) // eslint-disable-line comma-dangle
      ) // /shipToSubscribers.then
    } // /publish

    /**
     * Emits a topic event to all subscribers. Does not wait for subscriptions to
     * complete before returning a response.
     * @param {string} event - the name of the event being emitted
     * @param {any?} body - the payload to send to subscribers, if applicable
     * @param {object?} meta - metadata to include with the event metadata
     * @param {(^(all|errors|none)$)?} meta.reportVerbosity - whether to report all outcomes, errors, or nothing
     * @returns {EmissionResult} - The outcome of publishing, emitting, or delivering events
     */
    const emit = async (event, body, meta) => {
      const publishOptions = new PublishOptions({ name: event, body, meta })

      return shipToSubscribers(publishOptions).then(({ subscriptions, makeMeta }) => {
        // do not await allSettled
        allSettled(subscriptions)
          .then(maybeReport(publishOptions))

        return { count: subscriptions.length, meta: makeMeta() }
      }) // /shipToSubscribers.then
    } // /publish

    /**
     * Emits a topic event to all subscribers, and waits for each subscription
     * to acknowledge receipt before returning a response.
     * @param {string} event - the name of the event being delivered
     * @param {any?} body - the payload to send to subscribers, if applicable
     * @param {object?} meta - metadata to include with the event metadata
     * @param {(^(all|errors|none)$)?} meta.reportVerbosity - whether to report all outcomes, errors, or nothing
     * @returns {EmissionResult} - The outcome of publishing, emitting, or delivering events
     */
    const deliver = (event, body, meta) => {
      const publishOptions = new PublishOptions({ name: event, body, meta })

      return shipToSubscribers.withAckRequests(publishOptions)
        .then(({ subscriptions, makeMeta }) =>
          allSettled(subscriptions)
            .then(maybeReport(publishOptions))
            .then((results) => {
              return {
                count: subscriptions.length,
                meta: makeMeta(),
                results,
              }
            }) // eslint-disable-line comma-dangle
        ) // /shipToSubscribers.withAckRequests.then
    } // /deliver

    return { publish, emit, deliver }
  },
}
