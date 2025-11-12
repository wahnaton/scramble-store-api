import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'

export type MapFourthwallToMedusaIdsInput = {
  fourthwallProducts: FourthwallProduct[]
}

export type MapFourthwallToMedusaIdsOutput = {
  fourthwallProductIdToMedusaProductIdMap: Record<string, string>
  fourthwallVariantIdToMedusaVariantIdMap: Record<string, string>
}

export const mapFourthwallToMedusaIdsStep = createStep(
  'map-fourthwall-to-medusa-ids',
  async (input: MapFourthwallToMedusaIdsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productModuleService = container.resolve(Modules.PRODUCT)
    const fourthwallProductIds = input.fourthwallProducts.map(
      (fourthwallProduct) => fourthwallProduct.id,
    )

    const medusaProductsMatchingFourthwall = await productModuleService.listProducts(
      { external_id: fourthwallProductIds },
      { select: ['id', 'external_id'] },
    )

    const fourthwallProductIdToMedusaProductIdMap: Record<string, string> = {}
    for (const medusaProduct of medusaProductsMatchingFourthwall) {
      if (medusaProduct.external_id) {
        fourthwallProductIdToMedusaProductIdMap[medusaProduct.external_id] = medusaProduct.id
      }
    }

    const medusaProductIds = medusaProductsMatchingFourthwall.map(
      (medusaProduct) => medusaProduct.id,
    )
    const fourthwallVariantIdToMedusaVariantIdMap: Record<string, string> = {}

    if (medusaProductIds.length) {
      const medusaVariants = await productModuleService.listProductVariants(
        { product_id: medusaProductIds },
        { select: ['id', 'metadata', 'product_id'] },
      )

      for (const medusaVariant of medusaVariants) {
        const fourthwallVariantId = medusaVariant?.metadata?.external_id

        if (typeof fourthwallVariantId === 'string' && fourthwallVariantId) {
          fourthwallVariantIdToMedusaVariantIdMap[fourthwallVariantId] = medusaVariant.id
        }
      }
      logger.info(
        `[sync] mapped ${Object.keys(fourthwallProductIdToMedusaProductIdMap).length} Fourthwall products and ${Object.keys(fourthwallVariantIdToMedusaVariantIdMap).length} Fourthwall variants to Medusa ids`,
      )
    }

    return new StepResponse<MapFourthwallToMedusaIdsOutput>({
      fourthwallProductIdToMedusaProductIdMap,
      fourthwallVariantIdToMedusaVariantIdMap,
    })
  },
)
