# h3-express

Express polyfill for h3

## define a handler

```typescript
import { defineExpressHandler } from 'h3-express'

export default defineExpressHandler((req, res) => {
  req.json({
    req.path
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
