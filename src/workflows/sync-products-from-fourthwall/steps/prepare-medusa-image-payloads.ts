import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'

export type PrepareMedusaImagePayloadsInput = {
  fourthwallProducts: FourthwallProduct[]
  fourthwallProductIdToMedusaProductIdMap: Record<string, string>
}

export type PrepareMedusaImagePayloadsOutput = Record<string, string[]>

/**
 * Collects unique Fourthwall image URLs grouped by their target Medusa product.
 * Keeps this as a separate step so we can retry per product in the persistence step.
 */
export const prepareMedusaImagePayloadsStep = createStep(
  'prepare-medusa-image-payloads',
  (
    input: PrepareMedusaImagePayloadsInput,
    { container },
  ): StepResponse<PrepareMedusaImagePayloadsOutput> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const medusaProductIdToImageUrls = new Map<string, Set<string>>()

    for (const fourthwallProduct of input.fourthwallProducts) {
      const medusaProductId = input.fourthwallProductIdToMedusaProductIdMap[fourthwallProduct.id]

      const imageUrls = medusaProductIdToImageUrls.get(medusaProductId) ?? new Set<string>()

      for (const img of fourthwallProduct.images) {
        imageUrls.add(img.url)
      }

      for (const fourthwallVariant of fourthwallProduct.variants ?? []) {
        for (const fourthwallImage of fourthwallVariant.images) {
          imageUrls.add(fourthwallImage.transformedUrl ?? fourthwallImage.url)
        }
      }

      medusaProductIdToImageUrls.set(medusaProductId, imageUrls)
    }

    // Medusa works best with plain JS objects like record
    const output: PrepareMedusaImagePayloadsOutput = {}
    for (const [productId, urls] of medusaProductIdToImageUrls.entries()) {
      output[productId] = Array.from(urls)
    }

    logger.info(`[sync] Prepared image URLs across for ${Object.keys(output).length} products`)

    return new StepResponse(output)
  },
)
