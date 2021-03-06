import moment from 'moment'
import bittrex from 'node-bittrex-api'
import { Observable } from 'rxjs'
import { TIME_FRAME, PAIR, SESSION_ID } from 'Config'
import { candleQuery } from 'Util/db'

const clientObservable = Observable.fromEventPattern(h => bittrex.websockets.client(h))
const onConnectObservable = Observable.fromEventPattern(h => bittrex.options({ websockets: { onConnect: h } }))
const subscribeObservable = Observable.fromEventPattern(h => bittrex.websockets.subscribe([PAIR], h))

export const socketObservable = (
  client = clientObservable,
  onConnect = onConnectObservable,
  subscribe = subscribeObservable,
) =>
  client
    .flatMap(() => onConnect)
    .do(() => console.log('socket connected!')) // eslint-disable-line no-console
    .flatMap(() => subscribe)
    .filter(subscribtionData => subscribtionData && subscribtionData.M === 'updateExchangeState')
    .flatMap(exchangeState => Observable.from(exchangeState.A))
    .filter(marketData => marketData.Fills.length > 0)
    .map(marketData => marketData && marketData.Fills)
    .retry()

export const createCandle = (fillsData) => {
  const highPrice = fillsData.reduce((prev, curr) => (prev.Rate > curr.Rate ? prev : curr)).Rate
  const lowPrice = fillsData.reduce((prev, curr) => (prev.Rate < curr.Rate ? prev : curr)).Rate
  const volume = fillsData.reduce((prev, curr) => prev + curr.Quantity, 0)
  const openPrice = fillsData[0].Rate
  const closeObj = fillsData.pop()
  const closePrice = closeObj.Rate
  const closeTime = moment(closeObj.TimeStamp).milliseconds(0).toDate()
  return [closeTime, openPrice, highPrice, lowPrice, closePrice, volume]
}

export const candleQueryObservable = data => Observable.fromPromise(candleQuery(data))

export const candleObservable = (
  promise,
  timeFrame = TIME_FRAME,
  candleQueryFunc = candleQueryObservable,
  testScheduler = null,
) =>
  promise
    // buffer for timeFrame in milliseconds and then emit candle data
    .bufferTime(timeFrame * 1000, testScheduler)
    // if we have no data we continue
    .filter(fillsArrayOfArrays => fillsArrayOfArrays && fillsArrayOfArrays.length > 0)
    // flatten array
    .map(fillsArrayOfArrays => fillsArrayOfArrays.reduce((acc, arr) => [...acc, ...arr]))
    // create candle
    .map(fillsData => createCandle(fillsData))
    // insert into database and select
    .flatMap(candle => candleQueryFunc([SESSION_ID, ...candle]))
    // we retry forever
    .retry()

export default candleObservable(socketObservable())
