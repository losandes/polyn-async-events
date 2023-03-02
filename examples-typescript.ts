import * as Chai from 'chai';
import { Suite } from 'supposed';
import { Topic, ITopic, IEventMeta, ISubscriptionResult } from '.';

const test = Suite({
  name: 'polyn-pubsub-ts',
  assertionLibrary: Chai.expect,
  reporter: 'tap'
})

test('using TypeScript', {
  'given @polyn/async-events': {
    'when I subscribe to multiple events in one call, and then publish to that topic': {
      given: async () => {
        const topic: ITopic = new Topic({ topic: 'ts' })
        const eventNames: string[] = ['e1', 'e2', 'e3']
        const events: { event: any, meta: IEventMeta }[] = []
        const handler = (event: any, meta: IEventMeta) => events.push({ event, meta })
        const subscriptions: ISubscriptionResult | ISubscriptionResult[] = await topic.subscribe(
          [eventNames[0], eventNames[1], eventNames[2]],
          handler
        )

        // these should not be published to
        await topic.subscribe('foo1', handler)
        await topic.subscribe('foo2', handler)

        return { topic, eventNames, events, subscriptions }
      },
      when: async (
        { topic, eventNames, events, subscriptions }:
        {
          topic: ITopic;
          eventNames: string[];
          events: { event: any, meta: IEventMeta }[];
          subscriptions: string[];
        }
      ) => {
        const expected = ['expected1', 'expected2', 'expected3']
        const publishResults = [
          await topic.publish(eventNames[0], expected[0]),
          await topic.publish(eventNames[1], expected[1], { foo: 'bar' }),
          await topic.publish(eventNames[2], expected[2]),
        ]

        return {
          expected,
          topic,
          eventNames,
          events,
          subscriptions,
          publishResults
        }
      },
      'it should return the count of emissions': (expect: Chai.ExpectStatic) => (err: Error | null, actual: any) => {
        expect(err).to.be.null
        const { publishResults } = actual
        expect(publishResults[0].count).to.equal(1)
        expect(publishResults[1].count).to.equal(1)
        expect(publishResults[2].count).to.equal(1)
      },
      'it should publish data to each subscription': (expect: Chai.ExpectStatic) => (err: Error | null, actual: any) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }: { event: any, meta: IEventMeta }, idx: number) =>
          expect(event).to.equal(expected[idx])
        )
      }
    },
    'when I subscribe to multiple events in one call, and then emit to that topic': {
      given: async () => {
        const topic: ITopic = new Topic({ topic: 'ts' })
        const eventNames: string[] = ['e1', 'e2', 'e3']
        const events: { event: any, meta: IEventMeta }[] = []
        const handler = (event: any, meta: IEventMeta) => events.push({ event, meta })
        const subscriptions: ISubscriptionResult | ISubscriptionResult[] = await topic.subscribe(
          [eventNames[0], eventNames[1], eventNames[2]],
          handler
        )

        // these should not be published to
        await topic.subscribe('foo1', handler)
        await topic.subscribe('foo2', handler)

        return { topic, eventNames, events, subscriptions }
      },
      when: async (
        { topic, eventNames, events, subscriptions }:
        {
          topic: ITopic;
          eventNames: string[];
          events: { event: any, meta: IEventMeta }[];
          subscriptions: string[];
        }
      ) => new Promise(async (resolve) => {
        const expected = ['expected1', 'expected2', 'expected3']
        const publishResults = [
          await topic.emit(eventNames[0], expected[0]),
          await topic.emit(eventNames[1], expected[1], { foo: 'bar' }),
          await topic.emit(eventNames[2], expected[2]),
        ]

        setTimeout(() => resolve({
          expected,
          topic,
          eventNames,
          events,
          subscriptions,
          publishResults
        }), 50) // wait for subscriptions to finish
      }),
      'it should return the count of emissions': (expect: Chai.ExpectStatic) => (err: Error | null, actual: any) => {
        expect(err).to.be.null
        const { publishResults } = actual
        expect(publishResults[0].count).to.equal(1)
        expect(publishResults[1].count).to.equal(1)
        expect(publishResults[2].count).to.equal(1)
      },
      'it should emit data to each subscription': (expect: Chai.ExpectStatic) => (err: Error | null, actual: any) => {
        expect(err).to.be.null
        const { expected, events, subscriptions } = actual
        expect(events.length).to.equal(subscriptions.length)
        events.forEach(({ event }: { event: any, meta: IEventMeta }, idx: number) =>
          expect(event).to.equal(expected[idx])
        )
      }
    },
  }
})
