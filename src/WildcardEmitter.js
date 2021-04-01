module.exports = {
  name: 'WildcardEmitter',
  dependencies: ['events'],
  factory: (EventEmitter) => {
    'use strict'

    class WildcardEmitter extends EventEmitter {
      constructor (options) {
        super(options)
        options = { ...{ delimiter: '_', wildcard: '%', noSubscriptionsEvent: '' }, ...options }
        this.delimiter = options.delimiter
        this.wildcard = options.wildcard
        this.noSubscriptionsEvent = options.noSubscriptionsEvent
      }

      makeWildcards (event) {
        if (typeof event !== 'string' || !event.includes(this.delimiter)) {
          return [this.wildcard]
        }

        let idx = event.indexOf(this.delimiter)
        const indexes = []

        while (idx >= 0) {
          indexes.push(idx)
          idx = event.indexOf(this.delimiter, idx + 1)
        }

        return [
          ...[this.wildcard],
          ...indexes.map((idx) => `${event.substring(0, idx + 1)}${this.wildcard}`),
        ]
      }

      emit (event, ...args) {
        const wildcardResults = this.makeWildcards(event)
          .map((wildcard) => super.emit(wildcard, { event }, ...args))
        return super.emit(event, ...args) ||
          wildcardResults.includes(true) ||
          super.emit(this.noSubscriptionsEvent, { event }, ...args)
      }
    }

    return { WildcardEmitter }
  },
}
