import { ProductDTO, ProductVariantDTO } from '@medusajs/types'

export type FourthwallProductIdToMedusaProductMap = Map<string, ProductDTO>
export type FourthwallVariantIdToMedusaVariantMap = Map<string, ProductVariantDTO>

export const createFourthwallProductIdToMedusaProductMap = (
  medusaProducts: ProductDTO[],
): FourthwallProductIdToMedusaProductMap => {
  const map: FourthwallProductIdToMedusaProductMap = new Map()

  for (const product of medusaProducts) {
    if (product.external_id) {
      map.set(product.external_id, product)
    }
  }

  return map
}

export const createFourthwallVariantIdToMedusaVariantMap = (
  medusaVariants: ProductVariantDTO[] | undefined,
): FourthwallVariantIdToMedusaVariantMap => {
  const map: FourthwallVariantIdToMedusaVariantMap = new Map()

  for (const variant of medusaVariants || []) {
    const fourthwallVariantId = variant?.metadata?.external_id

    if (variant && typeof fourthwallVariantId === 'string' && fourthwallVariantId) {
      map.set(fourthwallVariantId, variant)
    }
  }

  return map
}
