# h3-express

Express polyfill for h3.

By default, Body-parsing is enabled. Therefore, query, body, params and cookie fields can be used without the following middlewares.

- express.urlencoded, 
- express.json
- express.raw
- express.text
- express.cookies.

## define a handler

```typescript
import { defineExpressHandler } from 'h3-express'

export default defineExpressHandler((req, res) => {
  req.json({
    req.path,
    req.query,
    req.body,
    req.params,
    req.cookies,
  })
})
```

## define a middleware

```typescript
import { defineExpressHandler } from 'h3-express'
import session from 'express-session'

export default defineExpressHandler(session({
  ...
}))
```

## define a compound middleware

```typescript
import { defineExpressHandler } from 'h3-express'
import express from 'express'
import session from 'express-session'
import fileupload from 'express-fileupload'

export default defineExpressHandler(express.Router()
  .use(session({
    ...
  }))
  .use(fileupload({
    ...
  }))
)
```

## get h3 event

```typescript
import { defineExpressHandler, getH3Event } from 'h3-express'

export default defineExpressHandler((req, res) => {
  const event = getH3Event(req)
  req.end()
})
```
