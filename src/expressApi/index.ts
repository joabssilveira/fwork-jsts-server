import cors from 'cors'
import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { ServerOptions, Server as SocketServer } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { expressApiEnv } from './env'

process.on('uncaughtException', (error, origin) => {
  console.log('----- Uncaught exception -----')
  console.log(error)
  console.log('----- Exception origin -----')
  console.log(origin)
})

process.on('unhandledRejection', (reason, promise) => {
  console.log('----- Unhandled Rejection at -----')
  console.log(promise)
  console.log('----- Reason -----')
  console.log(reason)
})

export interface ExpressApiInitOptions {
  middlewares?: any[] | undefined,
  onApiStart?: () => void | undefined
}

export interface ExpressSocketApiInitOptions extends ExpressApiInitOptions {

}

export class ExpressApi {
  expressApp = express()
  onApiStart?: () => void
  serverHttp?: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
  serverHttps?: https.Server<typeof http.IncomingMessage, typeof http.ServerResponse>

  constructor(options: ExpressApiInitOptions) {
    console.log('Api.init()');

    this.expressApp.use(cors())
    this.expressApp.use(express.json({
      limit: '5mb'
    }))
    this.expressApp.use(express.urlencoded({
      limit: '5mb'
    }))

    this.expressApp.get('/', (_: any, res: any) => {
      return res.send('Server is running...')
    })

    if (options.middlewares?.length) {
      options.middlewares.forEach(m => {
        this.expressApp.use(m)
      })
    }

    // HTTP
    if (expressApiEnv.httpProtocols?.toString().indexOf('http') != -1) {
      this.serverHttp = http.createServer(this.expressApp)
    }

    // HTTPS
    if (expressApiEnv.httpProtocols?.toString().indexOf('https') != -1) {
      const httpsOptions = {
        key: fs.existsSync(expressApiEnv.httpsCertKeyFile || '') ? fs.readFileSync(expressApiEnv.httpsCertKeyFile || '') : '',
        cert: fs.existsSync(expressApiEnv.httpsCertPemFile || "") ? fs.readFileSync(expressApiEnv.httpsCertPemFile || '') : ''
      }

      this.serverHttps = https.createServer(httpsOptions, this.expressApp)
    }

    if (options.onApiStart)
      this.onApiStart = options.onApiStart
  }

  start(args?: {
    callBack?: () => void | undefined
  }) {
    console.log(`env: ${JSON.stringify(expressApiEnv, null, 4)}`)

    // HTTP
    if (expressApiEnv.httpProtocols?.toString().indexOf('http') != -1) {
      this.serverHttp?.listen(expressApiEnv.httpPort, () => {
        console.log(`Server is running on http://localhost:${expressApiEnv.httpPort}`)
      })
    }

    // HTTPS
    if (expressApiEnv.httpProtocols?.toString().indexOf('https') != -1) {
      this.serverHttps?.listen(expressApiEnv.httpsPort, () => {
        console.log(`Server is running on https://localhost:${expressApiEnv.httpsPort}`)
      })
    }

    if (args?.callBack)
      args.callBack()

    if (this.onApiStart)
      this.onApiStart()
  }

  stop() {
    // HTTP
    if (expressApiEnv.httpProtocols?.toString().indexOf('http') != -1 && this.serverHttp) {
      this.serverHttp?.close()
    }

    // HTTPS
    if (expressApiEnv.httpProtocols?.toString().indexOf('https') != -1 && this.serverHttps) {
      this.serverHttps?.close()
    }
  }
}

export class ExpressSocketApi extends ExpressApi {
  socketApp?: SocketServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> | undefined

  constructor(options: ExpressSocketApiInitOptions) {
    super(options)

    let optionsConfig: Partial<ServerOptions> | undefined = {
      cors: {
        origin: '*',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 4e6, //4mb
      pingTimeout: 1000 * 60 * 2, //2m
      pingInterval: 1000 * 10, //10s
    }

    // HTTP
    if (expressApiEnv.httpProtocols?.toString().indexOf('http') != -1) {
      this.socketApp = new SocketServer(this.serverHttp, optionsConfig)
    }

    // HTTPS
    if (expressApiEnv.httpProtocols?.toString().indexOf('https') != -1) {
      this.socketApp = new SocketServer(this.serverHttps, optionsConfig)
    }
  }
}