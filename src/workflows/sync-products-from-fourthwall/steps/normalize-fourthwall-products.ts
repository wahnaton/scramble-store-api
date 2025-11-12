import { ProductTypes } from '@medusajs/framework/types'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'
import { isHexColor, normalizeIdentity } from '../../../utils/string-utils'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export type NormalizeFourthwallProductsInput = {
  fourthwallProducts: FourthwallProduct[]
  fourthwallProductIdToMedusaProductIdMap: Record<string, string>
  fourthwallVariantIdToMedusaVariantIdMap: Record<string, string>
}

export const normalizeFourthwallProductsStep = createStep(
  'normalize-fourthwall-products',
  async (input: NormalizeFourthwallProductsInput, { container }) => {

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const medusaProductUpserts: ProductTypes.UpsertProductDTO[] = input.fourthwallProducts.map((fourthwallProduct) => {
      
      const existingMedusaProductId = input.fourthwallProductIdToMedusaProductIdMap[fourthwallProduct.id]
      const title = fourthwallProduct.name
      const handle = fourthwallProduct.slug
      const thumbnail = fourthwallProduct.thumbnailImage?.transformedUrl

      const colorMap = new Map<string, string>()
      const sizeMap = new Map<string, string>()
      const colorSwatches: Record<string, string> = {}

      for (const fourthwallVariant of fourthwallProduct.variants || []) {

        const colorName = fourthwallVariant.attributes?.color?.name
        const colorSwatch = fourthwallVariant.attributes?.color?.swatch
        if (colorName) {
          const key = normalizeIdentity(colorName)
          if (key && !colorMap.has(key)) colorMap.set(key, colorName.trim())
          if (key && colorSwatch && isHexColor(colorSwatch)) {
            colorSwatches[key] = colorSwatch
          }
        }

        const sizeName = fourthwallVariant.attributes?.size?.name
        if (sizeName) {
          const key = normalizeIdentity(sizeName)
          if (key && !sizeMap.has(key)) sizeMap.set(key, sizeName.trim())
        }
      }

      // Prepare product options from collected values
      const options: Array<{ title: string; values: string[] }> = []
      if (sizeMap.size) {
        options.push({ title: 'Size', values: Array.from(sizeMap.values()) })
      }
      
      if (colorMap.size) {
        options.push({ title: 'Color', values: Array.from(colorMap.values()) })
      }

      const medusaVariantUpserts: ProductTypes.UpsertProductVariantDTO[] = (fourthwallProduct.variants || []).map(
        (fourthwallVariant) => {
          const medusaVariantUpsert: ProductTypes.UpsertProductVariantDTO = {
            id: input.fourthwallVariantIdToMedusaVariantIdMap[fourthwallVariant.id],
            title: fourthwallVariant.name ?? 'Default',
            metadata: { external_id: fourthwallVariant.id },
          }

          if (fourthwallVariant.sku) medusaVariantUpsert.sku = fourthwallVariant.sku

          const variantOptions: Record<string, string> = {}
          const sizeName = fourthwallVariant.attributes?.size?.name
          if (sizeName) {
            const key = normalizeIdentity(sizeName)
            const display = key ? sizeMap.get(key) : undefined
            if (display) variantOptions['Size'] = display
          }

          const colorName = fourthwallVariant.attributes?.color?.name
          if (colorName) {
            const key = normalizeIdentity(colorName)
            const display = key ? colorMap.get(key) : undefined
            if (display) variantOptions['Color'] = display
          }

          if (Object.keys(variantOptions).length) {
            medusaVariantUpsert.options = variantOptions
          }

          return medusaVariantUpsert
        },
      )

      const base: ProductTypes.UpsertProductDTO = {
        title,
        handle,
        description: fourthwallProduct.description ?? '',
        status: 'published' as const,
        thumbnail,
        external_id: fourthwallProduct.id,
        ...(options.length ? { options } : {}),
        variants: medusaVariantUpserts,
        metadata: {
          fourthwall_handle: fourthwallProduct.slug ?? handle,
          ...(Object.keys(colorSwatches).length ? { color_swatches: colorSwatches } : {}),
        },
      }

      return { id: existingMedusaProductId, ...base }
    })

    logger.info(`[sync] prepared ${medusaProductUpserts.length} Medusa product upserts`)
    return new StepResponse<ProductTypes.UpsertProductDTO[]>(medusaProductUpserts)
  },
)
