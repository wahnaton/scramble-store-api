import { ProductDTO } from "@medusajs/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { FourthwallProduct } from "../../../modules/fourthwall/fourthwall-client"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type PrepareVariantPricesInput = {
  fourthwallProducts: FourthwallProduct[]
  products: ProductDTO[]
  externalVariantIdToVariantIdMap: Record<string, string>
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
  "prepare-variant-prices",
  async (input: PrepareVariantPricesInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const remoteQuery = container.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY
    ) as (args: any, config?: any) => Promise<any[]>
    const productByExternalId = new Map(
      input.products.map((p: ProductDTO) => [p.external_id, p])
    )

    const entries: PrepareVariantPricesOutput["variantPrices"] = []

    for (const fwProduct of input.fourthwallProducts) {
      const medusaProduct = productByExternalId.get(fwProduct.id)
      if (!medusaProduct) continue
      const variants = (medusaProduct as any).variants || []
      const variantByExternalId = new Map(
        variants.map((v: any) => [v?.metadata?.external_id, v])
      )

      for (const fwVariant of fwProduct.variants) {
        const mappedVariantId = input.externalVariantIdToVariantIdMap[fwVariant.id]
        const medusaVariantId = mappedVariantId || (variantByExternalId.get(fwVariant.id) as any)?.id
        if (!medusaVariantId) continue

        const unitPrice = (fwVariant as any)?.unitPrice
        const value = unitPrice?.value
        const currency = (unitPrice?.currency || "USD").toString().toLowerCase()

        if (typeof value !== "number" || !Number.isFinite(value)) {
          logger.warn(
            `[sync] skipping price upsert for variant ${fwVariant.id} (${fwVariant.title}) on product ${fwProduct.id} due to missing unitPrice`
          )
          continue
        }

        const amount = Math.round(value * 100)

        entries.push({
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
    const variantIds = entries.map((e) => e.variant_id)
    let previousVariantIds: string[] = []
    if (variantIds.length) {
      const links = await remoteQuery({
        entryPoint: "product_variant_price_set",
        fields: ["variant_id"],
        variables: { filters: { variant_id: variantIds } },
      })
      const linkedIds = new Set<string>(links.map((l: any) => l.variant_id))
      previousVariantIds = variantIds.filter((id) => linkedIds.has(id))
    }

    logger.info(
      `[sync] prepared prices for ${entries.length} variants, previousVariantIds: ${previousVariantIds.length}`
    )

    return new StepResponse<PrepareVariantPricesOutput>({
      variantPrices: entries,
      previousVariantIds,
    })
  }
)
