import { ProductTypes } from '@medusajs/framework/types'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct, FourthwallVariant } from '../../../modules/fourthwall/fourthwall-types'
import { isHexColor, sanitizeString } from '../../../utils/string-utils'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export type CreateMedusaUpsertsInput = {
  fourthwallProducts: FourthwallProduct[]
  fourthwallProductIdToMedusaProductIdMap: Record<string, string>
  fourthwallVariantIdToMedusaVariantIdMap: Record<string, string>
}

export const createMedusaUpserts = createStep(
  'normalize-fourthwall-products',
  async (input: CreateMedusaUpsertsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const medusaProductUpserts: ProductTypes.UpsertProductDTO[] = []

    for (const fourthwallProduct of input.fourthwallProducts) {
      const existingMedusaProductId =
        input.fourthwallProductIdToMedusaProductIdMap[fourthwallProduct.id]

      const { colorMap, sizeMap, colorSwatches } = extractVariantAttributes(
        fourthwallProduct.variants ?? [],
      )

      const options = buildProductOptions(colorMap, sizeMap)

      const medusaVariantUpserts = buildVariantUpserts(
        fourthwallProduct.variants,
        colorMap,
        sizeMap,
        input.fourthwallVariantIdToMedusaVariantIdMap,
      )

      const medusaProductUpsert: ProductTypes.UpsertProductDTO = {
        title: fourthwallProduct.name,
        handle: fourthwallProduct.slug,
        description: fourthwallProduct.description ?? '',
        status: 'published',
        thumbnail: fourthwallProduct.thumbnailImage?.transformedUrl,
        external_id: fourthwallProduct.id,
        ...(options.length ? { options } : {}),
        variants: medusaVariantUpserts,
        metadata: {
          fourthwall_handle: fourthwallProduct.slug,
          ...(Object.keys(colorSwatches).length ? { color_swatches: colorSwatches } : {}),
        },
      }

      // If existingMedusaProductId is defined, medusa updates, otherwise medusa creates
      medusaProductUpserts.push({ id: existingMedusaProductId, ...medusaProductUpsert })
    }

    logger.info(`[sync] prepared ${medusaProductUpserts.length} Medusa product upserts`)
    return new StepResponse<ProductTypes.UpsertProductDTO[]>(medusaProductUpserts)
  },
)

const extractVariantAttributes = (variants: FourthwallVariant[]) => {
  const colorMap = new Map<string, string>()
  const sizeMap = new Map<string, string>()
  const colorSwatches: Record<string, string> = {}

  // Extract unique colors and sizes from variants
  for (const fourthwallVariant of variants) {
    const colorSwatch = fourthwallVariant.attributes.color?.swatch

    const colorName = fourthwallVariant.attributes.color?.name
    if (colorName) {
      const key = sanitizeString(colorName)
      if (key && !colorMap.has(key)) {
        colorMap.set(key, colorName.trim())
      }
      if (key && colorSwatch && isHexColor(colorSwatch)) {
        colorSwatches[key] = colorSwatch
      }
    }

    const sizeName = fourthwallVariant.attributes?.size?.name
    if (sizeName) {
      const key = sanitizeString(sizeName)
      if (key && !sizeMap.has(key)) {
        sizeMap.set(key, sizeName.trim())
      }
    }
  }

  return { colorMap, sizeMap, colorSwatches }
}

const buildProductOptions = (
  colorMap: Map<string, string>,
  sizeMap: Map<string, string>,
): Array<{ title: string; values: string[] }> => {
  const options: Array<{ title: string; values: string[] }> = []

  if (sizeMap.size) {
    options.push({ title: 'Size', values: Array.from(sizeMap.values()) })
  }

  if (colorMap.size) {
    options.push({ title: 'Color', values: Array.from(colorMap.values()) })
  }

  return options
}

const buildVariantUpserts = (
  variants: FourthwallVariant[] | undefined,
  colorMap: Map<string, string>,
  sizeMap: Map<string, string>,
  variantIdMap: Record<string, string>,
): ProductTypes.UpsertProductVariantDTO[] => {
  const medusaVariantUpserts: ProductTypes.UpsertProductVariantDTO[] = []

  for (const fourthwallVariant of variants || []) {
    const medusaVariantUpsert: ProductTypes.UpsertProductVariantDTO = {
      id: variantIdMap[fourthwallVariant.id],
      title: fourthwallVariant.name,
      metadata: { external_id: fourthwallVariant.id },
    }

    if (fourthwallVariant.sku) {
      medusaVariantUpsert.sku = fourthwallVariant.sku
    }

    const variantOptions: Record<string, string> = {}

    const sizeName = fourthwallVariant.attributes.size?.name
    if (sizeName) {
      const key = sanitizeString(sizeName)
      const display = key ? sizeMap.get(key) : undefined
      if (display) {
        variantOptions['Size'] = display
      }
    }

    const colorName = fourthwallVariant.attributes.color?.name
    if (colorName) {
      const key = sanitizeString(colorName)
      const display = key ? colorMap.get(key) : undefined
      if (display) {
        variantOptions['Color'] = display
      }
    }

    if (Object.keys(variantOptions).length) {
      medusaVariantUpsert.options = variantOptions
    }

    medusaVariantUpserts.push(medusaVariantUpsert)
  }

  return medusaVariantUpserts
}
