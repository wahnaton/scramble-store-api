import { ProductTypes, ProductDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type UpsertProductsInput = {
  upserts: ProductTypes.UpsertProductDTO[],
}

export const upsertProductsStep = createStep(
  "upsert-products",
  async (input: UpsertProductsInput, { container }) => {
    
    if (!input.upserts?.length) return new StepResponse<ProductDTO[]>([], [])
    const productModule = container.resolve(Modules.PRODUCT)
    const result = await productModule.upsertProducts(input.upserts)
    return new StepResponse<ProductDTO[]>(result, result)
  },
  async () => {
    // no-op compensation for upsert
  }
)