import express, { Request, Response } from 'express'
import { getQuery, isMethod, readBody, defineEventHandler, createError, readRawBody, parseCookies, H3Event } from 'h3'

declare type Handler = (req: Request, res: Response, next?: (err?: Error) => any) => any

const ExpressSymbol = Symbol.for('ExpressSymbol')
const app = {
  get() {
    // no handle
  }
}

export function defineExpressHandler(handler: Handler) {
  return defineEventHandler(async (event) => {
    const ereq = await toExpressRequest(event) as any
    const eres = await toExpressResponse(event) as any

    return await new Promise((resolve, reject) => {
      const next = (err?: Error) => {
        eres.off('close', next)
        eres.off('error', next)
        return err ? reject(createError(err)) : resolve(undefined)
      }

      try {
        ereq.next = next
        handler(ereq, eres, next)
        eres.once('close', next)
        eres.once('error', next)
      } catch (err) {
        next(err as Error)
      }
    })
  })
}

async function toExpressRequest(event: H3Event): Promise<Request> {
  const req: any = event.req
  if (req[ExpressSymbol]) {
    return req
  }

  const descs = Object.getOwnPropertyDescriptors(express.request)
  for (const key in descs) {
    Object.defineProperty(req, key, descs[key])
  }

  req.app = app
  req.query = getQuery(event)
  Object.defineProperty(req, 'params', {
    get: function () {
      return this.event.context.params
    },
    set: function (newValue) {
      this.event.context.params = newValue
    },
    enumerable: true,
    configurable: true,
  })
  if (isMethod(event, ['PATCH', 'POST', 'PUT', 'DELETE'])) {
    const contentType = req.headers["content-type"]
    const rawBody = await readRawBody(event, false)
    if (contentType === "application/octed-stream") {
      req.body = rawBody
    } else if (rawBody.length > 0 || contentType === "text/plain") {
      req.body = await readBody(event)
    } else {
      req.body = {}
    }
  }
  req.cookies = parseCookies(event)
  req[ExpressSymbol] = true
  return req as any
}

async function toExpressResponse(event: H3Event): Promise<Response> {
  const res: any = event.res
  if (res[ExpressSymbol]) {
    return res
  }

  const descs = Object.getOwnPropertyDescriptors(express.response)
  for (const key in descs) {
    Object.defineProperty(res, key, descs[key])
  }

  // Nuxt 3 bug: https://github.com/nuxt/framework/issues/3623
  const _setHeader = res.setHeader;
  res.setHeader = function setHeader(...args: any[]) {
    if (!res.headersSent) {
      _setHeader.apply(res, args)
    }
    return res
  }

  res._implicitHeader = function () {
    res.writeHead(res.statusCode)
  }

  res.app = app
  res[ExpressSymbol] = true
  return res as any
}
