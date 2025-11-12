import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'

export type MapFourthwallToMedusaIdsInput = {
  fourthwallProducts: FourthwallProduct[]
}

export type MapFourthwallToMedusaIdsOutput = {
  fourthwallProductIdToMedusaProductId: Record<string, string>
  fourthwallVariantIdToMedusaVariantId: Record<string, string>
}

export const mapFourthwallToMedusaIdsStep = createStep(
  'map-fourthwall-to-medusa-ids',
  async (input: MapFourthwallToMedusaIdsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productModuleService = container.resolve(Modules.PRODUCT)

    // Step 1. Build existing Fourthwall -> medusa product id map
    const fourthwallProductIdToMedusaProductId: Record<string, string> = {}

    const fourthwallProductIds = input.fourthwallProducts.map(
      (fourthwallProduct) => fourthwallProduct.id,
    )

    // Find any Fourthwall products that have already been synced to Medusa and add them to the map
    const alreadySyncdProducts = await productModuleService.listProducts(
      { external_id: fourthwallProductIds },
      { select: ['id', 'external_id'] },
    )

    for (const medusaProduct of alreadySyncdProducts) {
      fourthwallProductIdToMedusaProductId[medusaProduct.external_id!] = medusaProduct.id
    }

    // Step 2. Build the existing fourthwall Variant id to medusa variant id map
    const fourthwallVariantIdToMedusaVariantId: Record<string, string> = {}

    const medusaProductIds: string[] = alreadySyncdProducts.map((medusaProduct) => medusaProduct.id)

    if (medusaProductIds.length) {
      const medusaVariants = await productModuleService.listProductVariants(
        { product_id: medusaProductIds },
        { select: ['id', 'metadata', 'product_id'] },
      )

      for (const medusaVariant of medusaVariants) {
        const fourthwallVariantId = medusaVariant?.metadata?.external_id

        if (typeof fourthwallVariantId === 'string' && fourthwallVariantId) {
          fourthwallVariantIdToMedusaVariantId[fourthwallVariantId] = medusaVariant.id
        }
      }

      const productCount = Object.keys(fourthwallProductIdToMedusaProductId).length
      const variantCount = Object.keys(fourthwallVariantIdToMedusaVariantId).length

      logger.info(
        `[sync] mapped ${productCount} Fourthwall products and ${variantCount} Fourthwall variants to Medusa ids`,
      )
    }

    return new StepResponse<MapFourthwallToMedusaIdsOutput>({
      fourthwallProductIdToMedusaProductId: fourthwallProductIdToMedusaProductId,
      fourthwallVariantIdToMedusaVariantId: fourthwallVariantIdToMedusaVariantId,
    })
  },
)
