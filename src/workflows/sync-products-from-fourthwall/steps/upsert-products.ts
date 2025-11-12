import { ProductTypes, ProductDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

export type UpsertProductsInput = {
  medusaProductUpserts: ProductTypes.UpsertProductDTO[]
}

export const upsertProductsStep = createStep(
  'upsert-medusa-products',
  async (input: UpsertProductsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    if (!input.medusaProductUpserts?.length) {
      logger.info('[sync] no Medusa product upserts to apply')
      return new StepResponse<ProductDTO[]>([], [])
    }
    const productModule = container.resolve(Modules.PRODUCT)
    const result = await productModule.upsertProducts(input.medusaProductUpserts)
    logger.info(`[sync] upserted ${result.length} Medusa products`)
    return new StepResponse<ProductDTO[]>(result, result)
  },
  async () => {
    // no-op compensation for upsert
  },
)
