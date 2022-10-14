import { IncomingMessage, ServerResponse } from 'node:http'
import express, { Request, Response } from 'express'

declare type Handler = (req: Request, res: Response, next?: (err?: Error) => any) => any

export function defineExpressHandler(handler: Handler) {
  if (handler.length === 2) {
    return (req: IncomingMessage, res: ServerResponse) => {
      const ereq = toExpressRequest(req)
      const eres = toExpressResponse(res)
      return handler(ereq, eres)
    }
  } else {
    return (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => {
      const ereq = toExpressRequest(req)
      const eres = toExpressResponse(res)
      return handler(ereq, eres, next as any)
    }
  }
}

function toExpressRequest(req: any): Request {
  const descs = Object.getOwnPropertyDescriptors(express.request)
  for (const key in descs) {
      Object.defineProperty(req, key, descs[key])
  }
  return req as any
}

function toExpressResponse(res: any): Response {
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
  return res as any
}

