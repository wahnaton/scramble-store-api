import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import FourthwallProductSyncService from "../../../../modules/fourthwall/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve("fourthwall") as FourthwallProductSyncService
  await svc.syncProducts()
  res.status(204).end()
}