import { ProductTypes } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FourthwallProduct } from "../../../modules/fourthwall/fourthwall-client"
import { isHexColor, normalizeIdentity, slugify } from "../../../utils/string-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type NormalizeFourthwallProductsInput = {
  fourthwallProducts: FourthwallProduct[]
  externalIdToProductIdMap: Record<string, string>
  externalVariantIdToVariantIdMap: Record<string, string>
}

export const normalizeFourthwallProductsStep = createStep(
  "normalize-fourthwall-products",
  async (input: NormalizeFourthwallProductsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    
    const upserts: ProductTypes.UpsertProductDTO[] = input.fourthwallProducts.map((fwProduct) => {
      const existingId = input.externalIdToProductIdMap[fwProduct.id]
      const title = fwProduct.title ?? "Untitled"
      const handle = fwProduct.handle ?? slugify(title)
      const images = (fwProduct.images || []).map((image: { url?: string }) => image.url).filter(Boolean)

      const colorMap = new Map<string, string>()
      const sizeMap = new Map<string, string>() 
      const colorSwatches: Record<string, string> = {}

      for (const v of fwProduct.variants || []) {
        if (v.colorName) {
          const key = normalizeIdentity(v.colorName)
          if (key && !colorMap.has(key)) colorMap.set(key, v.colorName.trim())
          if (key && v.colorSwatch && isHexColor(v.colorSwatch)) {
            colorSwatches[key] = v.colorSwatch
          }
        }
        if (v.sizeName) {
          const key = normalizeIdentity(v.sizeName)
          if (key && !sizeMap.has(key)) sizeMap.set(key, v.sizeName.trim())
        }
      }

      // Prepare product options from collected values
      const options: Array<{ title: string; values: string[] }> = []
      if (sizeMap.size) {
        options.push({ title: "Size", values: Array.from(sizeMap.values()) })
      }
      if (colorMap.size) {
        options.push({ title: "Color", values: Array.from(colorMap.values()) })
      }

      const variants: ProductTypes.UpsertProductVariantDTO[] = (fwProduct.variants || []).map((variant) => {
        const v: ProductTypes.UpsertProductVariantDTO = {
          id: input.externalVariantIdToVariantIdMap[variant.id],
          title: variant.title ?? "Default",
          metadata: { external_id: variant.id },
        }
        if (variant.sku) v.sku = variant.sku

        const opt: Record<string, string> = {}
        if (variant.sizeName) {
          const key = normalizeIdentity(variant.sizeName)
          const display = key ? sizeMap.get(key) : undefined
          if (display) opt["Size"] = display
        }
        if (variant.colorName) {
          const key = normalizeIdentity(variant.colorName)
          const display = key ? colorMap.get(key) : undefined
          if (display) opt["Color"] = display
        }
        if (Object.keys(opt).length) {
          ;(v as any).options = opt
        }
        return v
      })

      const base: ProductTypes.UpsertProductDTO = {
        title,
        handle,
        description: fwProduct.description ?? "",
        status: "published" as const,
        thumbnail: images[0],
        external_id: fwProduct.id,
        ...(options.length ? { options } : {}),
        variants,
        metadata: {
          fourthwall_handle: fwProduct.handle ?? handle,
          ...(Object.keys(colorSwatches).length ? { color_swatches: colorSwatches } : {}),
        },
      }

      return { id: existingId, ...base }
    })

    logger.info(`[sync] prepared ${upserts.length} product upserts`)
    return new StepResponse<ProductTypes.UpsertProductDTO[]>(upserts)
  },
)
