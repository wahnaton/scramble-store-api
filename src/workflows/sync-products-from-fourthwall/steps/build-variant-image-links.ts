import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ProductDTO } from '@medusajs/types'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'
import {
  createFourthwallProductIdToMedusaProductMap,
  createFourthwallVariantIdToMedusaVariantMap,
} from '../utils/variant-mapping'

export type ImageVariantLink = {
  imageId: string
  variantIds: string[]
}

export type BuildVariantImageLinksInput = {
  fourthwallProducts: FourthwallProduct[]
  medusaProducts: ProductDTO[]
  medusaImageMap: Record<string, string>
}

export type BuildVariantImageLinksOutput = {
  links: ImageVariantLink[]
}

export const buildVariantImageLinksStep = createStep(
  'build-variant-image-links',
  (
    input: BuildVariantImageLinksInput,
    { container },
  ): StepResponse<BuildVariantImageLinksOutput> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const fourthwallIdToMedusaProduct: Map<string, ProductDTO> = createFourthwallProductIdToMedusaProductMap(
      input.medusaProducts,
    )

    const medusaImageIdToVariantIds = new Map<string, Set<string>>()

    for (const fourthwallProduct of input.fourthwallProducts) {
      const medusaProduct = fourthwallIdToMedusaProduct.get(fourthwallProduct.id)
      if (!medusaProduct) {
        logger.warn(`[sync] No Medusa product for Fourthwall product ${fourthwallProduct.id}; skipping images`)
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

    const links: ImageVariantLink[] = []
    for (const [imageId, variantIds] of medusaImageIdToVariantIds.entries()) {
      links.push({
        imageId,
        variantIds: Array.from(variantIds),
      })
    }

    logger.info(
      `[sync] prepared ${links.length} image↔variant links from ${input.fourthwallProducts.length} products`,
    )

    return new StepResponse({ links })
  },
)
