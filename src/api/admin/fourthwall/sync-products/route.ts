import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { syncProductsFromFourthwall } from "../../../../workflows/sync-products-from-fourthwall"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await syncProductsFromFourthwall.run({
    container: req.scope,
  })

  const { upsertedCount } = result

  res.status(200).json({ upsertedCount })
}