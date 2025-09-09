import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { linkProductsToSalesChannelWorkflow, upsertVariantPricesWorkflow } from "@medusajs/medusa/core-flows"
import { ProductDTO } from "@medusajs/types"
import { fetchFourthwallProductsStep } from "./steps/fetch-fourthwall-products"
import { mapExistingProductIdsStep } from "./steps/map-existing-product-ids"
import { normalizeFourthwallProductsStep } from "./steps/normalize-fourthwall-products"
import { upsertProductsStep } from "./steps/upsert-products"
import { prepareVariantPricesStep } from "./steps/prepare-variant-prices"


export const syncProductsFromFourthwall = createWorkflow("sync-products-from-fourthwall",
  () => {
    const fourthwallProducts = fetchFourthwallProductsStep()

    const mapExistingProductIdsOutput = mapExistingProductIdsStep({ fourthwallProducts })

    const externalIdToProductIdMap = mapExistingProductIdsOutput.externalIdToProductIdMap
    const externalVariantIdToVariantIdMap = mapExistingProductIdsOutput.externalVariantIdToVariantIdMap

    const upserts = normalizeFourthwallProductsStep({ fourthwallProducts, externalIdToProductIdMap, externalVariantIdToVariantIdMap })

    const products = upsertProductsStep({ upserts })

    const variantPriceData = prepareVariantPricesStep({ fourthwallProducts, products, externalVariantIdToVariantIdMap })

    const productIds = transform({ products }, (data) => data.products.map((p: ProductDTO) => p.id))

    // Always use default sales channel for sync
    const defaultSalesChannelId = 'sc_01K05XJND67JDXJY7DS38Y03TE'

    // Idempotent so we can just run it on everything
    // Consider changing in the future if thousands of products or getting throttled
    linkProductsToSalesChannelWorkflow.runAsStep({
      input: { id: defaultSalesChannelId, add: productIds },
    })

    upsertVariantPricesWorkflow.runAsStep({
      input: {
        variantPrices: variantPriceData.variantPrices,
        previousVariantIds: variantPriceData.previousVariantIds,
      },
    })

    return new WorkflowResponse({
      upsertedCount: productIds.length,
    })
  }
)
