import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FourthwallProduct } from "../../../modules/fourthwall/fourthwall-client"

export type MapExistingProductIdsInput = {
  fourthwallProducts: FourthwallProduct[]
}

export const mapExistingProductIdsStep = createStep(
  "map-external-id-to-product-id",
  async (input: MapExistingProductIdsInput, { container }) => {
    
    const productModuleService = container.resolve(Modules.PRODUCT)

    const existingProducts = await productModuleService.listProducts(
      { external_id: input.fourthwallProducts.map((fwProduct) => fwProduct.id) },
      { select: ["id", "external_id"] }
    )

    const externalIdToProductIdMap: Record<string, string> = {}

    existingProducts.forEach((product) => {
      if (product.external_id) {
        externalIdToProductIdMap[product.external_id] = product.id
      }
    })
    
    return new StepResponse<Record<string, string>>(externalIdToProductIdMap)
  },
)