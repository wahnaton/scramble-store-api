import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FOURTHWALL_MODULE } from "../../../modules/fourthwall"

export const fetchFourthwallProductsStep = createStep("retrieve-products-from-fourthwall", async (_, { container }) => {
  const fourthwallModule = container.resolve(FOURTHWALL_MODULE)
  const products = await fourthwallModule.retrieveProducts()
  return new StepResponse(products)
})