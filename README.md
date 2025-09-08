## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Commands
`npm install`
`npm run build`
`npm run dev`

## Example API Calls
Ping:
```
curl http://localhost:9000/health
```

Fourthwall Sync API:
```
TOKEN=$(curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r '.token')

curl -X POST http://localhost:9000/admin/fourthwall/sync-products \
  -H "Authorization: Bearer $TOKEN"
  ```

### Products API

Local call:
```
curl http://localhost:9000/store/products -H "x-publishable-api-key: <your-key>"
```

Server call:
```
curl -X GET https://api.playscramblegame.com/store/products -H "x-publishable-api-key: <your-key>"
```

Printful:
```
curl https://api.printful.com/store/products \
-H "Authorization: Bearer <your-key>"
```