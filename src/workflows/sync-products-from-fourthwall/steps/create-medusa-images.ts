import { Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ProductDTO, ProductImageDTO } from '@medusajs/types'
import { IProductModuleService } from '@medusajs/framework/types'

export type createMedusaImagesInput = {
  medusaProducts: ProductDTO[]
  imagePayloads: Record<string, string[]>
}
export type CreateMedusaImagesOutput = Record<string, string>

export const createMedusaImagesStep = createStep(
  'create-medusa-images',
  async (
    input: createMedusaImagesInput,
    { container },
  ): Promise<StepResponse<CreateMedusaImagesOutput>> => {
    const logger = container.resolve('logger')

    const productModule = container.resolve<IProductModuleService>(Modules.PRODUCT)

    const medusaProductById = new Map(input.medusaProducts.map((p) => [p.id, p]))

    const productCount = Object.keys(input.imagePayloads).length
    logger.info(`[sync] Preparing Medusa images across ${productCount} products`)

    const urlToMedusaImageId: Record<string, string> = {}

    for (const [medusaProductId, urls] of Object.entries(input.imagePayloads)) {
      const existingImages: ProductImageDTO[] = medusaProductById.get(medusaProductId)?.images || []
      const existingByUrl = new Map((existingImages || []).map((img) => [img.url, img.id]))

      // Idempotency: skip URLs already on the product
      const newUrls = urls.filter((url) => !existingByUrl.has(url))

      try {
        let updatedImages: ProductImageDTO[] = existingImages

        if (newUrls.length) {
          const updated: ProductDTO = await productModule.updateProducts(medusaProductId, {
            images: [...existingImages, ...newUrls.map((url) => ({ url }))],
          })
          updatedImages = updated.images
        }

        for (const url of urls) {
          const imageId = updatedImages.find((img) => img.url === url)?.id || existingByUrl.get(url)

          if (!imageId) {
            throw new Error(
              `Failed to resolve image id for URL ${url} on product ${medusaProductId}`,
            )
          }

          urlToMedusaImageId[url] = imageId
        }
      } catch (err) {
        logger.error(`Failed to process images for product ${medusaProductId}`, err)
      }
    }

    logger.info('[sync] createMedusaImagesStep completed.')

    return new StepResponse(urlToMedusaImageId)
  },
)
