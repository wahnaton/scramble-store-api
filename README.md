## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Commands
`yarn install`
`yarn build`
`yarn dev`

## Example API Calls
Ping:
```
curl http://localhost:9000/health
```

Products:
```
curl http://localhost:9000/store/products \
  -H "x-publishable-api-key: <your-key>"
```

Printful:
```
curl https://api.printful.com/store/products \
-H "Authorization: Bearer <your-key>"
```