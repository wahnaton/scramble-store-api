import { ProductDTO } from '@medusajs/types'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { FourthwallProduct } from '../../../modules/fourthwall/fourthwall-types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createFourthwallProductIdToMedusaProductMap } from '../utils/variant-mapping'

export type CreateVariantPriceUpsertsInput = {
  fourthwallProducts: FourthwallProduct[]
  medusaProducts: ProductDTO[]
  fourthwallVariantIdToMedusaVariantIdMap: Record<string, string>
}

export type CreateVariantPriceUpsertsOutput = {
  variantPrices: Array<{
    variant_id: string
    product_id: string
    prices: { amount: number; currency_code: string }[]
  }>
  previousVariantIds: string[]
}

export const createVariantPriceUpsertsStep = createStep(
  'create-variant-price-upserts',
  async (input: CreateVariantPriceUpsertsInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const fourthwallIdToMedusaProduct = createFourthwallProductIdToMedusaProductMap(
      input.medusaProducts,
    )

    const medusaVariantPriceEntries: CreateVariantPriceUpsertsOutput['variantPrices'] = []

    for (const fourthwallProduct of input.fourthwallProducts) {
      const medusaProduct = fourthwallIdToMedusaProduct.get(fourthwallProduct.id)

      if (!medusaProduct) {
        logger.warn(
          `[prepare-variant-prices] skipping price upsert for Fourthwall product ${fourthwallProduct.id} (${fourthwallProduct.name}) 
          as no corresponding Medusa product was found`,
        )
        continue
      }

      for (const fourthwallVariant of fourthwallProduct.variants || []) {
        const medusaVariantId = input.fourthwallVariantIdToMedusaVariantIdMap[fourthwallVariant.id]

        if (!medusaVariantId) {
          logger.warn(
            `[prepare-variant-prices] skipping price upsert for Fourthwall variant ${fourthwallVariant.id} (${fourthwallVariant.name}) 
            on product ${fourthwallProduct.id} as no corresponding Medusa variant was found`,
          )
          continue
        }

        const fourthwallVariantPriceValue = fourthwallVariant?.unitPrice?.value
        const currency = (fourthwallVariant?.unitPrice?.currency ?? 'USD').toString().toLowerCase()

        const amount = Math.round(fourthwallVariantPriceValue! * 100)

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

    // Identify variants that already have existing price-set links
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
      `[sync] prepared prices for ${medusaVariantPriceEntries.length} Medusa variants sourced from Fourthwall data,
       previousVariantIds length: ${previousVariantIds.length}`,
    )

    return new StepResponse<CreateVariantPriceUpsertsOutput>({
      variantPrices: medusaVariantPriceEntries,
      previousVariantIds,
    })
  },
)
