# @polyn/async-events

An async event emitter for NodeJS with support for emitting events (not waiting for subscriptions to be satisfied), and publishing events (waiting for subscriptions to be satisfied).

## Getting Started

```Shell
> npm install --save @polyn/async-events
```

## Creating a Topic

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })
```

### Subscribing to a Topic

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// subscribe to 1 type of event
logger.subscribe('error', (event, meta) => {
  // do something with the event, or metadata
})

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.time}::${JSON.stringify(event)}`)
)
```

#### Event Metadata

Event publishing and emission is accompanied with metadata about the event. This includes a random identifier, which can be used to track affinity across all of the subscribers that received the event, as well as the time the event was published (milliseconds since epoch), and the topic, and event names. This metadata can be extended, or overridden when publishing, or emitting an event.

Event metadata is passed as the 2nd argument to subscribers, and is also present, as the `meta` property, on the responses from `publish`, and `emit`. The subscribers receive the `subscriptionId`. The `publish`, and `emit` responses do not.

```TypeScript
{
  id: string;
  time: number;
  topic: string;
  event: string;
  subscriptionId?: string;
}
```

### Unsubscribing to a Topic

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// Subscribing to an event once can be accomplished by unsubscribing
// from within the event handler
logger.subscribe('error', (event, meta) => {
  logger.unsubscribe(meta.subscriptionId)
  console.log(event)
})

// Unsubscribing can also be accomplished outside of the event
const { subscriptionId } = logger.subscribe('error', (event, meta) => {
  console.log(event)
})

setTimeout(() => {
  logger.unsubscribe(subscriptionId)
}, 100)
```

### Publishing to a Topic

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// subscribe to 1 type of event
logger.subscribe('error', (event, meta) => {
  // do something with the event, or metadata
})

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.time}::${JSON.stringify(event)}`)
)

(async () => {
  const result1 = await logger.publish('info', 'hello world')
  // 1575998814931::"hello world"
  const result2 = await logger.publish('info', { message: 'hello world' })
  // 1575998820661::{"message":"hello world"}
})()
```

#### Publishing With Metadata

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.verbosity}::${meta.time}::${JSON.stringify(event)}`)
)

(async () => {
  const result1 = await logger.publish('info', 'hello world', { verbosity: 'INFO' })
  // INFO::1575998814931::"hello world"
  const result2 = await logger.publish('info', { message: 'hello world' }, { verbosity: 'INFO' })
  // INFO::1575998820661::{"message":"hello world"}
})()
```

#### Publish Results

The results of publishing an event returns the number of subscriptions that were published to, the event metadata, and the results of the subscriptions being [allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled).

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })
let count = 0

// this example returns `true` the first time, and then throws after that
logger.subscribe('info', (event, meta) => {
  if (count === 0) {
    count += 1
    return true
  }

  throw new Error('BOOM!')
})

(async () => {
  console.log(await logger.publish('info', 'hello world'))
  // {
  //   count: 2,
  //   meta: {
  //     id: 'logger::info::1f234c8',
  //     time: 1575999635401,
  //     topic: 'logger',
  //     event: 'info'
  //   },
  //   results: [
  //     { status: 'fulfilled', value: true },
  //     { status: 'rejected', reason: Error: BOOM! }
  //   ]
  // }
})()
```

### Emitting to a Topic

Emitting is the same as publishing, except that a result is returned immediately, without waiting for subscriptions to be fulfilled.

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// subscribe to 1 type of event
logger.subscribe('error', (event, meta) => {
  // do something with the event, or metadata
})

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.time}::${JSON.stringify(event)}`)
)

(async () => {
  const result1 = await logger.emit('info', 'hello world')
  // 1575998814931::"hello world"
  const result2 = await logger.emit('info', { message: 'hello world' })
  // 1575998820661::{"message":"hello world"}
})()
```

#### Emitting With Metadata

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.verbosity}::${meta.time}::${JSON.stringify(event)}`)
)

(async () => {
  const result1 = await logger.emit('info', 'hello world', { verbosity: 'INFO' })
  // INFO::1575998814931::"hello world"
  const result2 = await logger.emit('info', { message: 'hello world' }, { verbosity: 'INFO' })
  // INFO::1575998820661::{"message":"hello world"}
})()
```

#### Emission Results

The results of emitting an event returns the number of subscriptions that were published to, and the event metadata.

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger' })
let count = 0

// this example returns `true` the first time, and then throws after that
logger.subscribe('info', (event, meta) => {
  if (count === 0) {
    count += 1
    return true
  }

  throw new Error('BOOM!')
})

(async () => {
  console.log(await logger.emit('info', 'hello world'))
  // {
  //   count: 2,
  //   meta: {
  //     id: 'logger::info::1f234c8',
  //     time: 1575999635401,
  //     topic: 'logger',
  //     event: 'info'
  //   }
  // }
})()
```
