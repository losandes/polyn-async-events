module.exports = {
  name: 'allSettled',
  dependencies: [],
  factory: () => {
    'use strict'

    /**
     * The outcome of a Promise that was executed with `allSettled`
     * @typedef {Object} AllSettledResolution
     * @property {^(fulfilled|rejected)$} status - whether the promise called "resolve" or "reject"
     * @property {any?} value - the value that was passed to "resolve", if any
     * @property {Error} reason - the error that was passed to "reject", if any
     */

    /**
     * Executes an array of promises concurrently, and returns the outcomes
     * of each promise
     * @param {AsyncFunction<any?>[]} promises - the array of promises to execute
     * @returns {AllSettledResolution[]} - an array of outcomes from executed promises
     */
    function allSettled (promises) {
      return Promise.all(promises.map((promise) => {
        return new Promise((resolve) => {
          try {
            promise.then((value) => {
              resolve({ status: 'fulfilled', value })
            }).catch((err) => {
              resolve({ status: 'rejected', reason: err })
            })
          } catch (err) {
            // most likely, we received something other than a promise in the array
            resolve({ status: 'rejected', reason: err })
          }
        })
      }))
    }

    return { allSettled }
  },
}
