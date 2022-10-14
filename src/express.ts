import { IncomingMessage, ServerResponse } from 'node:http'
import express, { Request, Response, RequestHandler } from 'express'

export function defineExpressMiddleware(handler: RequestHandler) {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => {
    const ereq = toExpressRequest(req)
    const eres = toExpressResponse(res)

    handler(ereq, eres, next as any)
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
  res.setHeader = function setHeader(name: string, value: string | number | readonly string[]): ServerResponse {
      if (!res.headersSent) {
          _setHeader.call(res, name, value)
      }
      return res
  }

  res._implicitHeader = function () {
      res.writeHead(res.statusCode)
  }
  return res as any
}

