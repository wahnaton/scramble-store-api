import { ProductTypes, ProductDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

export type UpsertMedusaProductsInput = {
  medusaProductUpserts: ProductTypes.UpsertProductDTO[]
}

export const upsertMedusaProductsStep = createStep(
  'upsert-medusa-products',
  async (input: UpsertMedusaProductsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productModule = container.resolve(Modules.PRODUCT)

    if (!input.medusaProductUpserts?.length) {
      logger.info('[sync] no Medusa product upserts to apply')
      return new StepResponse<ProductDTO[]>([], [])
    }

    const result = await productModule.upsertProducts(input.medusaProductUpserts)

    logger.info(`[sync] upserted ${result.length} Medusa products`)
    return new StepResponse<ProductDTO[]>(result, result)
  },
  async () => {
    // no-op compensation for upsert
  },
)
