import express, { Request, Response } from 'express'
import { getQuery, isMethod, readBody, defineEventHandler, createError } from 'h3'

declare type Handler = (req: Request, res: Response, next?: (err?: Error) => any) => any

const ExpressSymbol = Symbol.for('ExpressSymbol')
const app = {
  get() {
    // no handle
  }
}

export function defineExpressHandler(handler: Handler) {
  const isMiddleware = handler.length > 2

  return defineEventHandler(async (event) => {
    const ereq = await toExpressRequest(event.req)
    const eres = await toExpressResponse(event.res)

    return await new Promise((resolve, reject) => {
      const next = (err?: Error) => {
        if (isMiddleware) {
          eres.off('close', next)
          eres.off('error', next)
        }
        return err ? reject(createError(err)) : resolve(undefined)
      }

      try {
        const returned = handler(ereq, eres, next)
        if (isMiddleware && returned === undefined) {
          eres.once('close', next)
          eres.once('error', next)
        } else {
          resolve(returned)
        }
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
    get: function() {
      return this.event.context.params
    },
    set: function(newValue) {
      this.event.context.params = newValue
    },
    enumerable: true,
    configurable: true,
  })
  if (isMethod(req.event, ['PATCH', 'POST', 'PUT', 'DELETE'])) {
    req.body = await readBody(req.event)
  }
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
