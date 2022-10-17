import express, { Request, Response } from 'express'
import { getQuery, isMethod, readBody, defineEventHandler, createError, readRawBody, parseCookies } from 'h3'

declare type Handler = (req: Request, res: Response, next?: (err?: Error) => any) => any

const ExpressSymbol = Symbol.for('ExpressSymbol')
const app = {
  get() {
    // no handle
  }
}

export function defineExpressHandler(handler: Handler) {
  return defineEventHandler(async (event) => {
    const ereq = await toExpressRequest(event.req) as any
    const eres = await toExpressResponse(event.res) as any

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

async function toExpressRequest(req: any): Promise<Request> {
  if (req[ExpressSymbol]) {
    return req
  }

  const descs = Object.getOwnPropertyDescriptors(express.request)
  for (const key in descs) {
    Object.defineProperty(req, key, descs[key])
  }

  req.app = app
  req.query = getQuery(req.event)
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
  if (isMethod(req.event, ['PATCH', 'POST', 'PUT', 'DELETE'])) {
    const contentType = req.headers["content-type"]
    const rawBody = await readRawBody(req.event, false)
    if (contentType === "application/octed-stream") {
      req.body = rawBody
    } else if (rawBody.length > 0 || contentType === "text/plain") {
      req.body = await readBody(req.event)
    } else {
      req.body = {}
    }
  }
  req.cookies = parseCookies(req.event)
  req[ExpressSymbol] = true
  return req as any
}

async function toExpressResponse(res: any): Promise<Response> {
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
