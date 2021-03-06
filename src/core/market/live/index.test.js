import moment from 'moment'
import { TestScheduler, Observable } from 'rxjs'
import { newSession, SESSION_ID } from 'Config'
import {
  socketObservable,
  candleObservable,
  createCandle,
  candleQueryObservable,
} from '.'
import 'Util/db/testSetup'

describe('Core/market/live', () => {
  // global helper functions
  const testCandleQuery = data => Observable.of(data)

  it('should create a socket connection and emit fills data', () => {
    const testScheduler = new TestScheduler((a, b) => expect(a).toEqual(b))
    // setup
    const clientMarble = 'a'
    const onConnectMarble = 'f'
    const subscribeMarble = '-m-n-j'
    const expectedMarble = '---x--'

    const clientInput = {
      a: { message: undefined },
    }

    const onConnectInput = {
      f: { message: 'socket connected' },
    }

    const subscribeInput = {
      m: {
        unhandled_data: {
          R: true,
          I: 1,
        },
      },
      n: {
        H: 'CoreHub',
        M: 'updateExchangeState',
        A: [{
          MarketName: 'USDT-BTC',
          Nounce: 1063222,
          Buys: [{
            Type: 1,
            Rate: 10928.316924,
            Quantity: 0,
          }, {
            Type: 2,
            Rate: 10918.99999998,
            Quantity: 0.52377906,
          }, {
            Type: 0,
            Rate: 10777.77653016,
            Quantity: 0.73745183,
          }],
          Sells: [{
            Type: 1,
            Rate: 11030.69999999,
            Quantity: 0,
          }, {
            Type: 0,
            Rate: 11613,
            Quantity: 0.00215814,
          }],
          Fills: [{
            OrderType: 'SELL',
            Rate: 10918.99999998,
            Quantity: 0.1,
            TimeStamp: '2018-03-02T18:07:37.427',
          }, {
            OrderType: 'SELL',
            Rate: 10928.316924,
            Quantity: 0.94404427,
            TimeStamp: '2018-03-02T18:07:36.647',
          }],
        }],
      },
      j: {
        H: 'CoreHub',
        M: 'updateExchangeState',
        A: [{
          MarketName: 'USDT-BTC',
          Nounce: 1063223,
          Buys: [],
          Sells: [{
            Type: 0,
            Rate: 11070.96599998,
            Quantity: 0.02662253,
          }, {
            Type: 1,
            Rate: 11070.96599999,
            Quantity: 0,
          }],
          Fills: [],
        }],
      },
    }

    const expectedInput = {
      x: [{
        OrderType: 'SELL',
        Rate: 10918.99999998,
        Quantity: 0.1,
        TimeStamp: '2018-03-02T18:07:37.427',
      }, {
        OrderType: 'SELL',
        Rate: 10928.316924,
        Quantity: 0.94404427,
        TimeStamp: '2018-03-02T18:07:36.647',
      }],
    }

    const client$ = testScheduler.createHotObservable(clientMarble, clientInput)
    const onConnect$ = testScheduler.createHotObservable(onConnectMarble, onConnectInput)
    const subsribe$ = testScheduler.createHotObservable(subscribeMarble, subscribeInput)

    const actual$ = socketObservable(client$, onConnect$, subsribe$)

    testScheduler.expectObservable(actual$).toBe(expectedMarble, expectedInput)
    testScheduler.flush()
  })
  it('should create candle from array of ticker data', () => {
    const ticks = [
      { OrderType: 'BUY',
        Rate: 0.0925,
        Quantity: 1,
        TimeStamp: '2018-01-24T19:07:03.063',
      },
      { OrderType: 'BUY',
        Rate: 0.0924,
        Quantity: 1,
        TimeStamp: '2018-01-24T19:08:03.063',
      },
      { OrderType: 'BUY',
        Rate: 0.0923,
        Quantity: 1,
        TimeStamp: '2018-01-24T19:09:03.063',
      },
    ]
    expect(createCandle(ticks)).toEqual([
      moment('2018-01-24T19:09:03.000').toDate(), // closeTime
      0.0925, // openPrice
      0.0925, // highPrice
      0.0923, // lowPrice
      0.0923, // closePrice
      3, // volume
    ])
  })
  it('should create candle from ticker data after x seconds', () => {
    const testScheduler = new TestScheduler((a, b) => expect(a).toEqual(b))
    // setup
    const socketMarble = 'x-y-(z|)'
    const expectedMarble = '----(a|)'

    const socketInput = {
      x: [
        { OrderType: 'BUY',
          Rate: 0.0923,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:07:03.063',
        },
      ],
      y: [
        { OrderType: 'BUY',
          Rate: 0.0924,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:08:03.063',
        },
      ],
      z: [
        { OrderType: 'BUY',
          Rate: 0.0925,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:09:03.063',
        },
      ],
    }

    const expectedInput = {
      a: [
        null,
        moment('2018-01-24T19:09:03.000').toDate(), // closeTime
        0.0923, // openPrice
        0.0925, // highPrice
        0.0923, // lowPrice
        0.0925, // closePrice
        3, // volume
      ],
    }

    const socket$ = testScheduler.createHotObservable(socketMarble, socketInput)

    const actual$ = candleObservable(socket$, 0.04, testCandleQuery, testScheduler)

    testScheduler.expectObservable(actual$).toBe(expectedMarble, expectedInput)
    testScheduler.flush()
  })
  it('should concat arrays after buffer', () => {
    const testScheduler = new TestScheduler((a, b) => expect(a).toEqual(b))
    // setup
    const socketMarble = '-x-y-(z|)'
    const expectedMarble = '-a-b-(c|)'

    const socketInput = {
      x: [
        { OrderType: 'BUY',
          Rate: 0.0923,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:07:03.063',
        },
      ],
      y: [
        { OrderType: 'BUY',
          Rate: 0.0924,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:08:03.063',
        },
      ],
      z: [
        { OrderType: 'BUY',
          Rate: 0.0925,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:09:03.063',
        },
      ],
    }

    const expectedInput = {
      a: [
        null,
        moment('2018-01-24T19:07:03.000').toDate(), // closeTime
        0.0923, // openPrice
        0.0923, // highPrice
        0.0923, // lowPrice
        0.0923, // closePrice
        1, // volume
      ],
      b: [
        null,
        moment('2018-01-24T19:08:03.000').toDate(), // closeTime
        0.0924, // openPrice
        0.0924, // highPrice
        0.0924, // lowPrice
        0.0924, // closePrice
        1, // volume
      ],
      c: [
        null,
        moment('2018-01-24T19:09:03.000').toDate(), // closeTime
        0.0925, // openPrice
        0.0925, // highPrice
        0.0925, // lowPrice
        0.0925, // closePrice
        1, // volume
      ],
    }

    const socket$ = testScheduler.createHotObservable(socketMarble, socketInput)

    const actual$ = candleObservable(socket$, 0.005, testCandleQuery, testScheduler)

    testScheduler.expectObservable(actual$).toBe(expectedMarble, expectedInput)
    testScheduler.flush()
  })
  it('shouldnt emit after if no data', () => {
    const testScheduler = new TestScheduler((a, b) => expect(a).toEqual(b))
    // setup
    const socketMarble = '--------|'
    const expectedMarble = '--------|'

    const socket$ = testScheduler.createHotObservable(socketMarble)

    const actual$ = candleObservable(socket$, 0.005, testCandleQuery, testScheduler)

    testScheduler.expectObservable(actual$).toBe(expectedMarble)
    testScheduler.flush()
  })
  it('should retry after error', () => {
    const testScheduler = new TestScheduler((a, b) => expect(a).toEqual(b))
    // setup
    const socketMarble = '-x-y-(z|)'
    const expectedMarble = '-a---(c|)'

    const socketInput = {
      x: [
        { OrderType: 'BUY',
          Rate: 0.0923,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:07:03.063',
        },
      ],
      y: 'hest', // in case of random data we get an error
      z: [
        { OrderType: 'BUY',
          Rate: 0.0925,
          Quantity: 1,
          TimeStamp: '2018-01-24T19:09:03.063',
        },
      ],
    }

    const expectedInput = {
      a: [
        null,
        moment('2018-01-24T19:07:03.000').toDate(), // closeTime
        0.0923, // openPrice
        0.0923, // highPrice
        0.0923, // lowPrice
        0.0923, // closePrice
        1, // volume
      ],
      c: [
        null,
        moment('2018-01-24T19:09:03.000').toDate(), // closeTime
        0.0925, // openPrice
        0.0925, // highPrice
        0.0925, // lowPrice
        0.0925, // closePrice
        1, // volume
      ],
    }

    const socket$ = testScheduler.createHotObservable(socketMarble, socketInput)

    const actual$ = candleObservable(socket$, 0.005, testCandleQuery, testScheduler)

    testScheduler.expectObservable(actual$).toBe(expectedMarble, expectedInput)
    testScheduler.flush()
  })
  it('should post candle to db and return rows from that session', async () => {
    expect.assertions(1)
    const testDbCandle = [
      moment('2018-01-24T19:09:03.063+01:00').toDate(), // closeTime
      0.0925, // openPrice
      0.0925, // highPrice
      0.0925, // lowPrice
      0.0925, // closePrice
      1, // volume
    ]

    const dbCandle = [
      [1516817343, 0.0925, 0.0925, 0.0925, 0.0925, 1],
    ]

    await newSession()
    const candleQueryPromise = candleQueryObservable([SESSION_ID, ...testDbCandle]).toPromise()
    await expect(candleQueryPromise).resolves.toEqual(dbCandle)
  })
  it('should post candle to db and return rows from that session for several rows', async () => {
    expect.assertions(1)
    const testDbCandle1 = [
      moment('2018-01-24T19:09:03.063+01:00').toDate(), // closeTime
      0.0925, // openPrice
      0.0925, // highPrice
      0.0925, // lowPrice
      0.0925, // closePrice
      1, // volume
    ]
    const testDbCandle2 = [
      moment('2018-01-24T19:10:03.063+01:00').toDate(), // closeTime
      0.0926, // openPrice
      0.0926, // highPrice
      0.0926, // lowPrice
      0.0926, // closePrice
      2, // volume
    ]

    const dbCandle = [
      [1516817343, 0.0925, 0.0925, 0.0925, 0.0925, 1],
      [1516817403, 0.0926, 0.0926, 0.0926, 0.0926, 2],
    ]

    await newSession()
    await candleQueryObservable([SESSION_ID, ...testDbCandle1]).toPromise()
    const candleQueryPromise2 = candleQueryObservable([SESSION_ID, ...testDbCandle2]).toPromise()
    await expect(candleQueryPromise2).resolves.toEqual(dbCandle)
  })
})
