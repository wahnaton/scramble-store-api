import { ProductDTO } from '@medusajs/types'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export type PrepareVariantPricesInput = {
  fourthwallProducts: FourthwallProduct[]
  medusaProducts: ProductDTO[]
  fourthwallVariantIdToMedusaVariantIdMap: Record<string, string>
}

export type PrepareVariantPricesOutput = {
  variantPrices: Array<{
    variant_id: string
    product_id: string
    prices: { amount: number; currency_code: string }[]
  }>
  previousVariantIds: string[]
}

export const prepareVariantPricesStep = createStep(
  'prepare-variant-prices',
  async (input: PrepareVariantPricesInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const medusaProductByFourthwallId = new Map(
      input.medusaProducts.map((product: ProductDTO) => [product.external_id, product]),
    )

    const medusaVariantPriceEntries: PrepareVariantPricesOutput['variantPrices'] = []

    for (const fourthwallProduct of input.fourthwallProducts) {
      const medusaProduct = medusaProductByFourthwallId.get(fourthwallProduct.id)
      if (!medusaProduct) continue
      const medusaVariants = medusaProduct.variants || []
      const medusaVariantByFourthwallId = new Map(
        medusaVariants.map((medusaVariant) => [medusaVariant?.metadata?.external_id, medusaVariant]),
      )

      for (const fourthwallVariant of fourthwallProduct.variants || []) {
        const existingMedusaVariantId =
          input.fourthwallVariantIdToMedusaVariantIdMap[fourthwallVariant.id]
        const medusaVariantId =
          existingMedusaVariantId || medusaVariantByFourthwallId.get(fourthwallVariant.id)?.id
        if (!medusaVariantId) continue

        const fourthwallVariantPriceValue = fourthwallVariant?.unitPrice?.value ?? fourthwallVariant?.price
        const currency = (
          fourthwallVariant?.unitPrice?.currency ??
          fourthwallProduct.currency ??
          'USD'
        )
          .toString()
          .toLowerCase()

        if (typeof fourthwallVariantPriceValue !== 'number' || !Number.isFinite(fourthwallVariantPriceValue)) {
          logger.warn(
            `[sync] skipping price upsert for Fourthwall variant ${fourthwallVariant.id} (${fourthwallVariant.name}) on product ${fourthwallProduct.id} due to missing unitPrice`,
          )
          continue
        }

        const amount = Math.round(fourthwallVariantPriceValue * 100)

        medusaVariantPriceEntries.push({
          variant_id: medusaVariantId,
          product_id: medusaProduct.id,
          prices: [
            {
              amount,
              currency_code: currency,
            },
          ],
        })
      }
    }

    // Only treat variants as "previous" if they already have a price set link
    const medusaVariantIds = medusaVariantPriceEntries.map((entry) => entry.variant_id)
    let previousVariantIds: string[] = []
    if (medusaVariantIds.length) {
      const variantPriceLinks = await remoteQuery({
        entryPoint: 'product_variant_price_set',
        fields: ['variant_id'],
        variables: { filters: { variant_id: medusaVariantIds } },
      })
      const linkedVariantIds = new Set<string>(variantPriceLinks.map((link) => link.variant_id))
      previousVariantIds = medusaVariantIds.filter((variantId) => linkedVariantIds.has(variantId))
    }

    logger.info(
      `[sync] prepared prices for ${medusaVariantPriceEntries.length} Medusa variants sourced from Fourthwall data, previousVariantIds: ${previousVariantIds.length}`,
    )

    return new StepResponse<PrepareVariantPricesOutput>({
      variantPrices: medusaVariantPriceEntries,
      previousVariantIds,
    })
  },
)
