import express, {
	type Request,
	type Response,
	type RequestHandler,
} from "express";
import {
	type H3Event,
	createError,
	defineEventHandler,
	getQuery,
	isMethod,
	parseCookies,
	readBody,
	readRawBody,
} from "h3";

const ExpressSymbol = Symbol.for("ExpressSymbol");
const app = {
	get() {
		// no handle
	},
};

export function getH3Event(target: Request | Response) {
	const extras = (target as any)[ExpressSymbol] as any;
	return extras.event as H3Event;
}

export function defineExpressHandler(handler: RequestHandler) {
	return defineEventHandler(async (event) => {
		const ereq = (await toExpressRequest(event)) as any;
		const eres = (await toExpressResponse(event)) as any;

    return await new Promise((resolve, reject) => {
      const next = (err?: Error | string) => {
        eres.off('close', next)
        eres.off('error', next)
        if (err) {
          return reject(createError(err))
        }
        return resolve(err)
      }

      try {
        ereq.res = eres
        eres.req = ereq
        ereq.next = next
        eres.once('close', next)
        eres.once('error', next)
        handler(ereq, eres, next)
      } catch (err) {
        next(err as Error)
      }
    })
  })
}

async function toExpressRequest(event: H3Event): Promise<Request> {
	const req: any = event.node.req;
	if (req[ExpressSymbol]) {
		return req;
	}

	const descs = Object.getOwnPropertyDescriptors(express.request);
	for (const key in descs) {
		Object.defineProperty(req, key, descs[key]);
	}

	req.app = app;
	req.query = getQuery(event);
	Object.defineProperty(req, "params", {
		get: () => event.context.params,
		set: (newValue) => {
			event.context.params = newValue;
		},
		enumerable: true,
		configurable: true,
	});
	if (isMethod(event, ["PATCH", "POST", "PUT", "DELETE"])) {
		const contentType = req.headers["content-type"];
		const rawBody = await readRawBody(event, false);
		if (contentType === "application/octed-stream") {
			req.body = rawBody;
		} else if (
			(rawBody && rawBody.length > 0) ||
			contentType === "text/plain"
		) {
			req.body = await readBody(event);
		} else {
			req.body = {};
		}
	}
	req.cookies = parseCookies(event);
	req[ExpressSymbol] = {
		event,
	};
	return req as any;
}

async function toExpressResponse(event: H3Event): Promise<Response> {
	const res: any = event.node.res;
	if (res[ExpressSymbol]) {
		return res;
	}

	const descs = Object.getOwnPropertyDescriptors(express.response);
	for (const key in descs) {
		Object.defineProperty(res, key, descs[key]);
	}

	// Nuxt 3 bug: https://github.com/nuxt/framework/issues/3623
	const _setHeader = res.setHeader;
	res.setHeader = function setHeader(...args: any[]) {
		if (!res.headersSent) {
			_setHeader.apply(res, args);
		}
		return res;
	};

	res._implicitHeader = () => {
		res.writeHead(res.statusCode);
	};

	res.app = app;
	res[ExpressSymbol] = {
		event,
	};
	return res as any;
}
