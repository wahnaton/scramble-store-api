import { ProductTypes, ProductDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type UpsertProductsInput = {
  upserts: ProductTypes.UpsertProductDTO[],
}

export const upsertProductsStep = createStep(
  "upsert-products",
  async (input: UpsertProductsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    if (!input.upserts?.length) {
      logger.info("[sync] no product upserts to apply")
      return new StepResponse<ProductDTO[]>([], [])
    }
    const productModule = container.resolve(Modules.PRODUCT)
    const result = await productModule.upsertProducts(input.upserts)
    logger.info(`[sync] upserted ${result.length} products`)
    return new StepResponse<ProductDTO[]>(result, result)
  },
  async () => {
    // no-op compensation for upsert
  }
)
