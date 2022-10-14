import { IncomingMessage, ServerResponse } from 'node:http'
import express, { Request, Response } from 'express'

declare type Handler = (req: Request, res: Response, next?: (err?: Error) => any) => any

const ExpressSymbol = Symbol.for('ExpressSymbol')
const app = {
  get() {
    // no handle
  }
}

export function defineExpressHandler(handler: Handler) {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => {
    const ereq = toExpressRequest(req)
    const eres = toExpressResponse(res)
    return handler(ereq, eres, next as any)
  }
}

function toExpressRequest(req: any): Request {
  if (req[ExpressSymbol]) {
    return req
  }

  const descs = Object.getOwnPropertyDescriptors(express.request)
  for (const key in descs) {
      Object.defineProperty(req, key, descs[key])
  }

  req.app = app
  req[ExpressSymbol] = true
  return req as any
}

function toExpressResponse(res: any): Response {
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

