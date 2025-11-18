import { ProductDTO, ProductVariantDTO } from '@medusajs/types'

export const createFourthwallProductIdToMedusaProductMap = (
  medusaProducts: ProductDTO[],
): Map<string, ProductDTO> => {
  const fourthwallProductIdToMedusaProductMap: Map<string, ProductDTO> = new Map()

  for (const product of medusaProducts) {
    if (product.external_id) {
      fourthwallProductIdToMedusaProductMap.set(product.external_id, product)
    }
  }

  return fourthwallProductIdToMedusaProductMap
}

export const createFourthwallVariantIdToMedusaVariantMap = (
  medusaVariants: ProductVariantDTO[] | undefined,
): Map<string, ProductVariantDTO> => {
  const fourthwallVariantIdToMedusaVariantMap: Map<string, ProductVariantDTO> = new Map()

  for (const variant of medusaVariants || []) {
    const fourthwallVariantId = variant?.metadata?.external_id

    if (variant && typeof fourthwallVariantId === 'string' && fourthwallVariantId) {
      fourthwallVariantIdToMedusaVariantMap.set(fourthwallVariantId, variant)
    }
  }

  return fourthwallVariantIdToMedusaVariantMap
}
