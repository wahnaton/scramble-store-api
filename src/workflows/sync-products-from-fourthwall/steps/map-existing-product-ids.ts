import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FourthwallProduct } from "../../../modules/fourthwall/fourthwall-client"

export type MapExistingProductIdsInput = {
  fourthwallProducts: FourthwallProduct[]
}

export type MapExistingProductIdsOutput = {
  externalIdToProductIdMap: Record<string, string>
  externalVariantIdToVariantIdMap: Record<string, string>
}

export const mapExistingProductIdsStep = createStep(
  "map-external-id-to-product-id",
  async (input: MapExistingProductIdsInput, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const externalProductIds = input.fourthwallProducts.map((fw) => fw.id)

    const existingProducts = await productModuleService.listProducts(
      { external_id: externalProductIds },
      { select: ["id", "external_id"] }
    )

    const externalIdToProductIdMap: Record<string, string> = {}
    for (const product of existingProducts) {
      if (product.external_id) {
        externalIdToProductIdMap[product.external_id] = product.id
      }
    }

    const productIds = existingProducts.map((p) => p.id)
    const externalVariantIdToVariantIdMap: Record<string, string> = {}

    if (productIds.length) {
      const variants = await productModuleService.listProductVariants(
        { product_id: productIds },
        { select: ["id", "metadata", "product_id"] }
      )

      for (const variant of variants) {
        const extId = (variant as any)?.metadata?.external_id
        
        if ((variant as any)?.metadata?.external_id) {
          externalVariantIdToVariantIdMap[extId] = variant.id
        }
      }
    }

    return new StepResponse<MapExistingProductIdsOutput>({
      externalIdToProductIdMap,
      externalVariantIdToVariantIdMap,
    })
  }
)