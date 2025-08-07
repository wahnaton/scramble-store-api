import { ProductTypes } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FourthwallProduct } from "../../../modules/fourthwall/fourthwall-client"
import { slugify } from "../../../utils/string-utils"

export type NormalizeFourthwallProductsInput = {
  fourthwallProducts: FourthwallProduct[]
  externalIdToProductIdMap: Record<string, string>
  externalVariantIdToVariantIdMap: Record<string, string>
}

export const normalizeFourthwallProductsStep = createStep(
  "normalize-fourthwall-products",
  async (input: NormalizeFourthwallProductsInput) => {
    
    const upserts: ProductTypes.UpsertProductDTO[] = input.fourthwallProducts.map((fwProduct) => {
      const existingId = input.externalIdToProductIdMap[fwProduct.id]
      const title = fwProduct.title ?? "Untitled"
      const handle = fwProduct.handle ?? slugify(title)
      const images = (fwProduct.images || []).map((image: { url?: string }) => image.url).filter(Boolean)

      const base = {
        title,
        handle,
        description: fwProduct.description ?? "",
        status: "published" as const,
        thumbnail: images[0],
        external_id: fwProduct.id,
        variants: fwProduct.variants.map((variant) => {
          const v: ProductTypes.UpsertProductVariantDTO = {
            id: input.externalVariantIdToVariantIdMap[variant.id],
            title: variant.title ?? "Default",
            metadata: { external_id: variant.id },
          }
          if (variant.sku) v.sku = variant.sku
          return v
        }),
        metadata: { fourthwall_handle: fwProduct.handle ?? handle },
      }
      return { id: existingId, ...base }
    })

    return new StepResponse<ProductTypes.UpsertProductDTO[]>(upserts)
  },
)