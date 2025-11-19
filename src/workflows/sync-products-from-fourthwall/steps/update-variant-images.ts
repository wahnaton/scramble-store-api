import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { VariantImageIdMap } from './build-variant-image-ids'

type UpdateVariantImagesInput = {
  imageIds: VariantImageIdMap[]
}

const BATCH_SIZE = 50

export const updateVariantImageStep = createStep(
  'update-variant-images',
  async (input: UpdateVariantImagesInput, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const variantImagePairs = collectUniqueVariantImagePairs(input.imageIds)

    logger.info(
      `[sync] syncing ${variantImagePairs.length} variant→image pairs in ${Math.ceil(variantImagePairs.length / BATCH_SIZE) || 0} batches`,
    )

    for (let startIndex = 0; startIndex < variantImagePairs.length; startIndex += BATCH_SIZE) {
      const batch = variantImagePairs.slice(startIndex, startIndex + BATCH_SIZE)
      if (batch.length === 0) {
        break
      }
      await productModuleService.addImageToVariant(batch)
    }

    return new StepResponse(null)
  },
)

const collectUniqueVariantImagePairs = (
  imageIds: VariantImageIdMap[] = [],
): { image_id: string; variant_id: string }[] => {
  const variantImagePairs: { image_id: string; variant_id: string }[] = []
  const seenImageVariantKeys = new Set<string>()

  for (const image of imageIds) {
    for (const variantId of image.variantIds ?? []) {
      const key = `${image.imageId}:${variantId}`
      if (seenImageVariantKeys.has(key)) {
        continue
      }
      seenImageVariantKeys.add(key)
      variantImagePairs.push({ image_id: image.imageId, variant_id: variantId })
    }
  }

  return variantImagePairs
}
