module.exports = (test, dependencies) => {
  'use strict'

  const { Topic, id } = dependencies
  const random = id.makeId

  return test('given @polyn/async-events', {
    '// TODO: unsubscribe': (expect) => {},
    'when I publish to a topic that has synchronous, and async subscriptions': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventName = String(random())
        const events = []
        const types = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = [
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, async (event, meta) => new Promise((resolve) => {
            setTimeout(() => resolve(handler(event, meta)), 50)
          })),
        ]

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe('types', (event) => types.push(event))

        return { topic, eventName, events, types, subscriptions }
      },
      when: async ({ topic, eventName, events, types, subscriptions }) => {
        const expected = random()
        const expectedTypes = [
          undefined,
          null,
          1,
          'one',
          true,
          { foo: 'bar' },
          [1, 2, 3],
          function () { return 42 },
        ]
        const publishResult = await topic.publish(eventName, expected)
        expectedTypes.forEach(async (value) => topic.publish('types', value))

        return {
          expected,
          expectedTypes,
          topic,
          eventName,
          events,
          types,
          subscriptions,
          publishResult,
        }
      },
      'it should return the count of emissions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult, subscriptions } = actual
        expect(publishResult.count).to.equal(subscriptions.length)
      },
      'it should publish data to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }) => expect(event).to.equal(expected))
      },
      'it should support payloads of all types': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { types, expectedTypes } = actual
        expect(types).to.deep.equal(expectedTypes)
      },
      'it should publish event metadata to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { topic, eventName, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ meta }) => {
          expect(meta.id.includes(topic.name), 'event id should include the topic name').to.equal(true)
          expect(meta.id.includes(eventName), 'event id should include the event name').to.equal(true)
          expect(meta.subscriptionId.includes(topic.name), 'event subscriptionId should include the topic name').to.equal(true)
          expect(meta.subscriptionId.includes(eventName), 'event subscriptionId should include the event name').to.equal(true)
          expect(typeof meta.time, 'event time should be a number (ms since epoch)').to.equal('number')
          expect(meta.topic, 'event topic should be present').to.equal(topic.name)
          expect(meta.event, 'event name should be present').to.equal(eventName)
        })
      },
      'the metadata should be the same across all subscriptions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { events } = actual

        expect(events[0].meta.id).to.equal(events[1].meta.id)
        expect(events[0].meta.time).to.equal(events[1].meta.time)
        expect(events[0].meta.topic).to.equal(events[1].meta.topic)
        expect(events[0].meta.event).to.equal(events[1].meta.event)

        expect(events[1].meta.id).to.equal(events[2].meta.id)
        expect(events[1].meta.time).to.equal(events[2].meta.time)
        expect(events[1].meta.topic).to.equal(events[2].meta.topic)
        expect(events[1].meta.event).to.equal(events[2].meta.event)
      },
      'the metadata subscription id should be different across all subscriptions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { events } = actual

        expect(events[0].meta.subscriptionId).to.not.equal(events[1].meta.subscriptionId)
        expect(events[1].meta.subscriptionId).to.not.equal(events[2].meta.subscriptionId)
      },
      'the publish result should include event metadata': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { topic, eventName, publishResult } = actual
        const { meta } = publishResult

        expect(meta.id.includes(topic.name), 'event id should include the topic name').to.equal(true)
        expect(meta.id.includes(eventName), 'event id should include the event name').to.equal(true)
        expect(typeof meta.time, 'event time should be a number (ms since epoch)').to.equal('number')
        expect(meta.topic, 'event topic should be present').to.equal(topic.name)
        expect(meta.event, 'event name should be present').to.equal(eventName)

        // return {
        //   log: {
        //     "id": "log::data::r29800322209484875",
        //     "subscriptionId": "log::data::r9543974595144391",
        //     "time": 1575486291478,
        //     "name": "data"
        //   }
        // }
      },
      'the publish result should include subscription results and statuses': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { events } = actual

        expect(events[0].meta.subscriptionId).to.not.equal(events[1].meta.subscriptionId)
        expect(events[1].meta.subscriptionId).to.not.equal(events[2].meta.subscriptionId)
      },
      'the publish result should include event metadata (allSettled)': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult } = actual
        const { results } = publishResult

        results.forEach((result) => {
          expect(result.status).to.equal('fulfilled')
          expect(typeof result.value).to.equal('number')
        })
      },
    },
    'when I publish to a topic and one of the subscriptions fails': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventName = String(random())
        const expected = []
        const events = []
        const handler = (success) => {
          expected.push(success)
          return (event, meta) => new Promise((resolve, reject) => {
            setTimeout(() => {
              if (success) {
                events.push({ event, meta })
                return resolve(true)
              }

              reject(new Error('BOOM!'))
            }, 5)
          })
        }
        const subscriptions = [
          await topic.subscribe(eventName, handler(false)),
          await topic.subscribe(eventName, handler(true)),
          await topic.subscribe(eventName, handler(false)),
          await topic.subscribe(eventName, handler(true)),
        ]

        return { topic, eventName, expected, events, subscriptions }
      },
      when: async ({ topic, eventName, expected, events, subscriptions }) => {
        const publishResult = await topic.publish(eventName, random())

        return {
          expected,
          topic,
          eventName,
          events,
          subscriptions,
          publishResult,
        }
      },
      'it should publish to all subscriptions, and the publish result should indicate whether the subscription was fulfilled, or rejected': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult, expected } = actual
        const { results } = publishResult

        results.forEach((result, idx) => {
          const _expected = expected[idx] ? 'fulfilled' : 'rejected'
          expect(result.status).to.equal(_expected)

          if (_expected === 'fulfilled') {
            expect(result.value).to.equal(true)
          } else {
            expect(result.reason.message).to.equal('BOOM!')
          }
        })
      },
    },
    'when I subscribe to multiple events in one call, and then publish to that topic': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventNames = [String(random()), String(random()), String(random())]
        const events = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = await topic.subscribe([eventNames[0], eventNames[1], eventNames[2]], handler)

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe(String(random()), handler)

        return { topic, eventNames, events, subscriptions }
      },
      when: async ({ topic, eventNames, events, subscriptions }) => {
        const expected = [random(), random(), random()]
        const publishResults = [
          await topic.publish(eventNames[0], expected[0]),
          await topic.publish(eventNames[1], expected[1]),
          await topic.publish(eventNames[2], expected[2]),
        ]

        return {
          expected,
          topic,
          eventNames,
          events,
          subscriptions,
          publishResults,
        }
      },
      'it should return the count of emissions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResults } = actual
        expect(publishResults[0].count).to.equal(1)
        expect(publishResults[1].count).to.equal(1)
        expect(publishResults[2].count).to.equal(1)
      },
      'it should publish data to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }, idx) => expect(event).to.equal(expected[idx]))
      },
    },
    'when I publish an event that has no subscriptions': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        return { topic }
      },
      when: async ({ topic }) => {
        const publishResult = await topic.publish('foo', 42)

        return {
          topic,
          publishResult,
        }
      },
      'it should return the count of emissions as being 0': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult } = actual
        expect(publishResult.count).to.equal(0)
      },
    },
    'when I publish metadata with an event': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventName = String(random())
        const events = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = [
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, async (event, meta) => new Promise((resolve) => {
            setTimeout(() => resolve(handler(event, meta)), 30)
          })),
        ]

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe(String(random()), handler)

        return { topic, eventName, events, subscriptions }
      },
      when: async ({ topic, eventName, events, subscriptions }) => {
        const expected = random()
        const metadata = { type: 'INFO', id: 1 }
        const publishResult = await topic.publish(eventName, expected, metadata)

        return {
          expected,
          metadata,
          topic,
          eventName,
          events,
          subscriptions,
          publishResult,
        }
      },
      'it should publish event metadata to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { eventName, metadata, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ meta }) => {
          expect(meta.id, 'it should support overriding the default metadata').to.equal(metadata.id)
          expect(meta.type, 'it should support extending the default metadata').to.equal(metadata.type)
          expect(meta.event, 'it should include default metadata that isn\'t overridden').to.equal(eventName)
        })
      },
      'the publish result should include event metadata': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { eventName, publishResult, metadata } = actual
        const { meta } = publishResult

        expect(meta.id, 'it should support overriding the default metadata').to.equal(metadata.id)
        expect(meta.type, 'it should support extending the default metadata').to.equal(metadata.type)
        expect(meta.event, 'it should include default metadata that isn\'t overridden').to.equal(eventName)
      },
    },
    'when I emit to a topic that has synchronous, and async subscriptions': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventName = String(random())
        const events = []
        const types = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = [
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, async (event, meta) => new Promise((resolve) => {
            setTimeout(() => resolve(handler(event, meta)), 50)
          })),
        ]

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe('types', (event) => types.push(event))

        return { topic, eventName, events, types, subscriptions }
      },
      when: async ({ topic, eventName, events, types, subscriptions }) => {
        const expected = random()
        const expectedTypes = [
          undefined,
          null,
          1,
          'one',
          true,
          { foo: 'bar' },
          [1, 2, 3],
          function () { return 42 },
        ]
        const publishResult = await topic.emit(eventName, expected)
        expectedTypes.forEach(async (value) => topic.emit('types', value))

        return new Promise((resolve) => {
          setTimeout(() => resolve({
            expected,
            expectedTypes,
            topic,
            eventName,
            events,
            types,
            subscriptions,
            publishResult,
          }), 100) // wait for the async subscriptions to finish
        })
      },
      'it should return the count of emissions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult, subscriptions } = actual
        expect(publishResult.count).to.equal(subscriptions.length)
      },
      'it should emit data to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }) => expect(event).to.equal(expected))
      },
      'it should support payloads of all types': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { types, expectedTypes } = actual
        expect(types).to.deep.equal(expectedTypes)
      },
      'it should emit event metadata to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { topic, eventName, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ meta }) => {
          expect(meta.id.includes(topic.name), 'event id should include the topic name').to.equal(true)
          expect(meta.id.includes(eventName), 'event id should include the event name').to.equal(true)
          expect(meta.subscriptionId.includes(topic.name), 'event subscriptionId should include the topic name').to.equal(true)
          expect(meta.subscriptionId.includes(eventName), 'event subscriptionId should include the event name').to.equal(true)
          expect(typeof meta.time, 'event time should be a number (ms since epoch)').to.equal('number')
          expect(meta.topic, 'event topic should be present').to.equal(topic.name)
          expect(meta.event, 'event name should be present').to.equal(eventName)
        })
      },
      'the metadata should be the same across all subscriptions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { events } = actual

        expect(events[0].meta.id).to.equal(events[1].meta.id)
        expect(events[0].meta.time).to.equal(events[1].meta.time)
        expect(events[0].meta.topic).to.equal(events[1].meta.topic)
        expect(events[0].meta.event).to.equal(events[1].meta.event)

        expect(events[1].meta.id).to.equal(events[2].meta.id)
        expect(events[1].meta.time).to.equal(events[2].meta.time)
        expect(events[1].meta.topic).to.equal(events[2].meta.topic)
        expect(events[1].meta.event).to.equal(events[2].meta.event)
      },
      'the metadata subscription id should be different across all subscriptions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { events } = actual

        expect(events[0].meta.subscriptionId).to.not.equal(events[1].meta.subscriptionId)
        expect(events[1].meta.subscriptionId).to.not.equal(events[2].meta.subscriptionId)
      },
      'the emit result should include event metadata': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { topic, eventName, publishResult } = actual
        const { meta } = publishResult

        expect(meta.id.includes(topic.name), 'event id should include the topic name').to.equal(true)
        expect(meta.id.includes(eventName), 'event id should include the event name').to.equal(true)
        expect(typeof meta.time, 'event time should be a number (ms since epoch)').to.equal('number')
        expect(meta.topic, 'event topic should be present').to.equal(topic.name)
        expect(meta.event, 'event name should be present').to.equal(eventName)

        // return {
        //   log: {
        //     "id": "log::data::r29800322209484875",
        //     "subscriptionId": "log::data::r9543974595144391",
        //     "time": 1575486291478,
        //     "name": "data"
        //   }
        // }
      },
    },
    'when I subscribe to multiple events in one call, and then emit to that topic': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventNames = [String(random()), String(random()), String(random())]
        const events = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = await topic.subscribe([eventNames[0], eventNames[1], eventNames[2]], handler)

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe(String(random()), handler)

        return { topic, eventNames, events, subscriptions }
      },
      when: async ({ topic, eventNames, events, subscriptions }) => {
        const expected = [random(), random(), random()]
        const publishResults = [
          await topic.publish(eventNames[0], expected[0]),
          await topic.publish(eventNames[1], expected[1]),
          await topic.publish(eventNames[2], expected[2]),
        ]

        return new Promise((resolve) => {
          setTimeout(() => resolve({
            expected,
            topic,
            eventNames,
            events,
            subscriptions,
            publishResults,
          }), 50) // wait for the async subscriptions to finish
        })
      },
      'it should return the count of emissions': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResults } = actual
        expect(publishResults[0].count).to.equal(1)
        expect(publishResults[1].count).to.equal(1)
        expect(publishResults[2].count).to.equal(1)
      },
      'it should publish data to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }, idx) => expect(event).to.equal(expected[idx]))
      },
    },
    'when I emit an event that has no subscriptions': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        return { topic }
      },
      when: async ({ topic }) => {
        const publishResult = await topic.publish('foo', 42)

        return {
          topic,
          publishResult,
        }
      },
      'it should return the count of emissions as being 0': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { publishResult } = actual
        expect(publishResult.count).to.equal(0)
      },
    },
    'when I emit metadata with an event': {
      given: async () => {
        const topic = new Topic({ topic: String(random()) })
        const eventName = String(random())
        const events = []
        const handler = (event, meta) => events.push({ event, meta })
        const subscriptions = [
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, handler),
          await topic.subscribe(eventName, async (event, meta) => new Promise((resolve) => {
            setTimeout(() => resolve(handler(event, meta)), 30)
          })),
        ]

        // these should not be published to
        await topic.subscribe(String(random()), handler)
        await topic.subscribe(String(random()), handler)

        return { topic, eventName, events, subscriptions }
      },
      when: async ({ topic, eventName, events, subscriptions }) => {
        const expected = random()
        const metadata = { type: 'INFO', id: 1 }
        const publishResult = await topic.emit(eventName, expected, metadata)

        return new Promise((resolve) => {
          setTimeout(() => resolve({
            expected,
            metadata,
            topic,
            eventName,
            events,
            subscriptions,
            publishResult,
          }), 100) // wait for the subscriptions to finish
        })
      },
      'it should publish event metadata to each subscription': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { eventName, metadata, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ meta }) => {
          expect(meta.id, 'it should support overriding the default metadata').to.equal(metadata.id)
          expect(meta.type, 'it should support extending the default metadata').to.equal(metadata.type)
          expect(meta.event, 'it should include default metadata that isn\'t overridden').to.equal(eventName)
        })
      },
      'the publish result should include event metadata': (expect) => (err, actual) => {
        expect(err).to.be.null
        const { eventName, publishResult, metadata } = actual
        const { meta } = publishResult

        expect(meta.id, 'it should support overriding the default metadata').to.equal(metadata.id)
        expect(meta.type, 'it should support extending the default metadata').to.equal(metadata.type)
        expect(meta.event, 'it should include default metadata that isn\'t overridden').to.equal(eventName)
      },
    },
    'failure modes': {
      'when I subscribe with a null event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.subscribe(null, () => {})
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid SubscriptionOptions')).to.equal(true)
        },
      },
      'when I subscribe with an undefined event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.subscribe(undefined, () => {})
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid SubscriptionOptions')).to.equal(true)
        },
      },
      'when I subscribe with a non-string event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.subscribe(1, () => {})
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid SubscriptionOptions')).to.equal(true)
        },
      },
      'when I subscribe with an array event name that contains a non string': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.subscribe(['foo', 1], () => {})
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid SubscriptionOptions')).to.equal(true)
        },
      },
      'when I subscribe with a callback that isn\'t a function': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.subscribe('foo', null)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid SubscriptionOptions')).to.equal(true)
        },
      },
      'when I publish with a null event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.publish(null, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
      'when I publish with an undefined event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.publish(undefined, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
      'when I publish with a non-string event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.publish(1, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
      'when I emit with a null event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.emit(null, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
      'when I emit with an undefined event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.emit(undefined, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
      'when I emit with a non-string event name': {
        when: async () => {
          const topic = new Topic({ topic: String(random()) })
          await topic.emit(1, 42)
        },
        'it should throw': (expect) => (err) => {
          expect(err).to.not.be.null
          expect(err.message.includes('Invalid PublishOptions')).to.equal(true)
        },
      },
    },
  })
}
