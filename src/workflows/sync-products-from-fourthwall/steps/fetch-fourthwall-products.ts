import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FOURTHWALL_MODULE, IFourthwallModuleService } from "../../../modules/fourthwall"

export const fetchFourthwallProductsStep = createStep("retrieve-products-from-fourthwall", async (_, { container }) => {
  const fourthwallModule = container.resolve<IFourthwallModuleService>(FOURTHWALL_MODULE)
  const products = await fourthwallModule.retrieveProducts()
  return new StepResponse(products)
})