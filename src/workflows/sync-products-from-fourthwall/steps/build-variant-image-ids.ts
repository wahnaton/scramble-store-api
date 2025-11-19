import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ProductDTO } from '@medusajs/types'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'
import {
  createFourthwallProductIdToMedusaProductMap,
  createFourthwallVariantIdToMedusaVariantMap,
} from '../utils/variant-mapping'

export type VariantImageIdMap = {
  imageId: string
  variantIds: string[]
}

export type BuildVariantImageIdsInput = {
  fourthwallProducts: FourthwallProduct[]
  medusaProducts: ProductDTO[]
  medusaImageMap: Record<string, string>
}

export type BuildVariantImageIdsOutput = {
  imageIds: VariantImageIdMap[]
}

export const buildVariantImageIdsStep = createStep(
  'build-variant-image-ids',
  (input: BuildVariantImageIdsInput, { container }): StepResponse<BuildVariantImageIdsOutput> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const fourthwallIdToMedusaProduct: Map<string, ProductDTO> =
      createFourthwallProductIdToMedusaProductMap(input.medusaProducts)

    const medusaImageIdToVariantIds = new Map<string, Set<string>>()

    for (const fourthwallProduct of input.fourthwallProducts) {
      const medusaProduct = fourthwallIdToMedusaProduct.get(fourthwallProduct.id)
      if (!medusaProduct) {
        logger.warn(
          `[sync] No Medusa product for Fourthwall product ${fourthwallProduct.id}; skipping images`,
        )
        continue
      }

      const fourthwallVariantIdToMedusaVariant = createFourthwallVariantIdToMedusaVariantMap(
        medusaProduct.variants || [],
      )

      for (const fourthwallVariant of fourthwallProduct.variants || []) {
        const medusaVariant = fourthwallVariantIdToMedusaVariant.get(fourthwallVariant.id)
        if (!medusaVariant) {
          logger.warn(
            `[sync] No Medusa variant for Fourthwall variant ${fourthwallVariant.id}; skipping images`,
          )
          continue
        }

        for (const fourthwallVariantImage of fourthwallVariant.images) {
          const url = fourthwallVariantImage.transformedUrl ?? fourthwallVariantImage.url
          const medusaImageId = input.medusaImageMap[url]
          if (!medusaImageId) {
            logger.warn(`No Medusa image id found for url ${url}; skipping link`)
            continue
          }

          const medusaVariantIds = medusaImageIdToVariantIds.get(medusaImageId) ?? new Set<string>()
          medusaVariantIds.add(medusaVariant.id)
          medusaImageIdToVariantIds.set(medusaImageId, medusaVariantIds)
        }
      }
    }

    const imageIds: VariantImageIdMap[] = []
    for (const [imageId, variantIds] of medusaImageIdToVariantIds.entries()) {
      imageIds.push({
        imageId,
        variantIds: Array.from(variantIds),
      })
    }

    logger.info(
      `[sync] prepared ${imageIds.length} image↔variant ids from ${input.fourthwallProducts.length} products`,
    )

    return new StepResponse({ imageIds })
  },
)
