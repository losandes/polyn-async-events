# @polyn/async-events

[![tests](https://github.com/losandes/polyn-async-events/actions/workflows/pull-requests.yml/badge.svg)](https://github.com/losandes/polyn-async-events/actions/workflows/pull-requests.yml)
[![test coverage](https://coveralls.io/repos/github/losandes/polyn-async-events/badge.svg?branch=latest)](https://coveralls.io/github/losandes/polyn-async-events?branch=latest)
[![known vulnerabilities](https://snyk.io/test/github/losandes/polyn-async-events/badge.svg)](https://snyk.io/test/github/losandes/polyn-async-events)


An async event emitter for NodeJS with support for emitting events (not waiting for subscriptions to be satisfied), publishing events (waiting for subscriptions to be satisfied), and delivering events (waiting for subscriptions to acknowledge receipt).

Also extends NodeJS' events package with a [WildcardEmitter](#wildcardemitter) which adds support for namespaces (i.e. wildcard listeners), and to listen for events that have no subscribers.

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
logger.subscribe('info', (event, meta) => {
  // do something with the event, or metadata
})

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta) => console.log(`${meta.time}::${JSON.stringify(event)}`)
)
```

### Subscribing to subscriber errors and reporting

When creating a topic, you can set the reportVerbosity, as well as the event names that are used to emit fullfilment and rejection states. By default, this library will emit errors using an 'error' event. You can turn off 'error' emission by setting `reportVerbosity to 'none'. By default, this library does not emit fulfullment. You can turn fulfilment emission on by setting `reportVerbosity` to 'all'. The default event for fulfilment is `fulfilled`.

The topic level verbosity can be overriden by passing a `reportVerbosity` value as part of the `meta` argument when emitting, publishing, or delivering to a topic (shown below).



```JavaScript
const { Topic } = require('@polyn/async-events')

const emitter = new Topic({
  topic: 'emitter',
  reportVerbosity: 'errors', // all|errors|none; 'errors' is default
  reportEventNames: {        // emample uses the default values
    fulfilled: 'fulfilled',
    rejected: 'error',
  },
})

emitter.subscribe('something', async (event, meta) => { /*...*/ })
emitter.subscribe('something', async (event, meta) => { throw new Error('BOOM!') })
emitter.subscribe('fulfilled', (event, meta) => {
  // do something with the event, or metadata
  console.log(event, meta)
})
emitter.subscribe('error', (event, meta) => {
  // do something with the event, or metadata
  console.log(event, meta)
})

emitter.publish('something', 42, { reportVerbosity: 'all' })
// emits an 'error' event because a subscriber threw
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
logger.subscribe('info', (event, meta) => {
  logger.unsubscribe(meta.subscriptionId)
  console.log(event)
})

// Unsubscribing can also be accomplished outside of the event
const { subscriptionId } = logger.subscribe('info', (event, meta) => {
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
logger.subscribe('info', (event, meta) => {
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
logger.subscribe('info', (event, meta) => {
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

### Delivering to a Topic

Delivering is the same as publishing, except that subscribers are presented with an `ack` argument, which needs to be called within a timeout period (default is 3 seconds). The `ack` argument accepts standard `callback` conventions: `(err: Error, result: any)`.

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger', timeout: 3000 })

// subscribe to 1 type of event
logger.subscribe('info', (event, meta) => {
  // do something with the event, or metadata
})

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta, ack) => {
    console.log(`${meta.time}::${JSON.stringify(event)}`)
    ack(null, event)
  }
)

(async () => {
  const result1 = await logger.deliver('info', 'hello world')
  // 1575998814931::"hello world"
  const result2 = await logger.deliver('info', { message: 'hello world' })
  // 1575998820661::{"message":"hello world"}
})()
```

#### Delivering With Metadata

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger', timeout: 3000 })

// subscribe to many types of events
logger.subscribe(
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  (event, meta, ack) => {
    console.log(`${meta.verbosity}::${meta.time}::${JSON.stringify(event)}`)
    ack(null, event)
  }
)

(async () => {
  const result1 = await logger.deliver('info', 'hello world', { verbosity: 'INFO' })
  // INFO::1575998814931::"hello world"
  const result2 = await logger.deliver('info', { message: 'hello world' }, { verbosity: 'INFO' })
  // INFO::1575998820661::{"message":"hello world"}
})()
```

#### Delivery Results

The results of delivering an event returns the number of subscriptions that were published to, and the event metadata.

```JavaScript
const { Topic } = require('@polyn/async-events')

const logger = new Topic({ topic: 'logger', timeout: 3000 })
let count = 0

// this example returns `true` the first time, and then throws after that
logger.subscribe('info', (event, meta, ack) => {
  if (count === 0) {
    count += 1
    return ack(null, true)
  }

  ack(new Error('BOOM!'))
})

(async () => {
  console.log(await logger.deliver('info', 'hello world'))
  /*
   * {
   *   count: 1,
   *   meta: {
   *     id: 'delivery_logger::info::c9tx9xej',
   *     time: 1581641381559,
   *     topic: 'delivery_logger',
   *     event: 'info'
   *   },
   *   results: [ { status: 'fulfilled', value: true } ]
   * }
   */

  console.log(await logger.deliver('info', 'hello world'))
  /*
  * {
  *   count: 1,
  *   meta: {
  *     id: 'delivery_logger::info::9iv7v8co',
  *     time: 1581641381559,
  *     topic: 'delivery_logger',
  *     event: 'info'
  *   },
  *   results: [
  *     {
  *       status: 'rejected',
  *       reason: Error: BOOM!
  *           at ...
  *     }
  *   ]
  * }
  */
})()
```

## WildcardEmitter

### Creating a WildcardEmitter

```JavaScript
const { WildcardEmitter } = require('@polyn/async-events')

const emitter = new WildcardEmitter()
const customEmitter = new WildcardEmitter({
  delimiter: '.',
  wildcard: '*',
  noSubscriptionsEvent: 'no_listeners',
})
```

### Subscribing with wildcards

The default delimiter is `_`, and the default wildcard is `%`.

```JavaScript
const { WildcardEmitter } = require('@polyn/async-events')

const emitter = new WildcardEmitter()

emitter.on('%', (...args) => {
  console.log('%', args)
})

emitter.on('foo_%', (...args) => {
  console.log('foo_%', args)
})

emitter.on('foo_bar_%', (...args) => {
  console.log('foo_bar_%', args)
})

emitter.on('foo_bar_baz', (...args) => {
  console.log('foo_bar_baz', args)
})

emitter.emit('foo_bar_baz', 'one', { two: 2 })
/* prints:
 * '%' [{ event: 'foo_bar_baz' }, 'one', { two: 2 }]
 * 'foo_%' [{ event: 'foo_bar_baz' }, 'one', { two: 2 }]
 * 'foo_bar_%' [{ event: 'foo_bar_baz' }, 'one', { two: 2 }]
 * 'foo_bar_baz' ['one', { two: 2 }]
 */
```

> NOTE that events that match exactly receive only the `...args`, while events that match on a wildcard receive the event name as the first argument.

### Subscribing to events that have no listeners

Subscribing to events that have no listeners is helpful for debugging, and to make sure you don't have events that are silently going nowhere. The default event the WildcardEmitter publishes to when no listeners are found is, `''`.

```JavaScript
const { WildcardEmitter } = require('@polyn/async-events')

const emitter = new WildcardEmitter()

emitter.on('', (...args) => {
  console.log('no listeners!', args)
})

emitter.emit('foo_bar_baz', 'one', { two: 2 })
/* prints:
 * 'no listeners!' [{ event: 'foo_bar_baz' }, 'one', { two: 2 }]
 */
```
