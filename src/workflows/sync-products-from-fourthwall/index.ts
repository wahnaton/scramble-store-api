import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import {
  linkProductsToSalesChannelWorkflow,
  upsertVariantPricesWorkflow,
} from '@medusajs/medusa/core-flows'
import { ProductDTO, UpsertProductDTO } from '@medusajs/types'
import { fetchFourthwallProductsStep } from './steps/fetch-fourthwall-products'
import { mapFourthwallToMedusaIdsStep } from './steps/map-existing-product-ids'
import { normalizeFourthwallProductsStep } from './steps/normalize-fourthwall-products'
import { upsertProductsStep } from './steps/upsert-products'
import { prepareVariantPricesStep } from './steps/prepare-variant-prices'
import { FourthwallProduct as FourthwallProduct } from '../../modules/fourthwall/fourthwall-types'

export const syncProductsFromFourthwall = createWorkflow('sync-products-from-fourthwall', () => {

  // Call Fourthwall API to get products
  const fourthwallProducts: FourthwallProduct[] = fetchFourthwallProductsStep()

  // Map existing Medusa product and variant ids to the Fourthwall ids we sync against
  const fourthwallToMedusaIdMaps = mapFourthwallToMedusaIdsStep({ fourthwallProducts })

  const fourthwallProductIdToMedusaProductIdMap =
    fourthwallToMedusaIdMaps.fourthwallProductIdToMedusaProductIdMap

  const fourthwallVariantIdToMedusaVariantIdMap =
    fourthwallToMedusaIdMaps.fourthwallVariantIdToMedusaVariantIdMap

  // Convert Fourthwall products to Medusa upsert payloads
  const medusaProductUpserts: UpsertProductDTO[] = normalizeFourthwallProductsStep({
    fourthwallProducts,
    fourthwallProductIdToMedusaProductIdMap,
    fourthwallVariantIdToMedusaVariantIdMap,
  })

  const medusaProducts: ProductDTO[] = upsertProductsStep({ medusaProductUpserts })

  // Add Fourthwall variant prices to their corresponding Medusa variants
  const variantPricePreparation = prepareVariantPricesStep({
    fourthwallProducts,
    medusaProducts,
    fourthwallVariantIdToMedusaVariantIdMap,
  })

  upsertVariantPricesWorkflow.runAsStep({
    input: {
      variantPrices: variantPricePreparation.variantPrices,
      previousVariantIds: variantPricePreparation.previousVariantIds,
    },
  })

  // const variantImages: // Some step that returns this type BatchImageVariantsWorkflowInput
  // batchImageVariantsWorkflow.runAsStep({
  //   input: { variantImages },
  // })

  // Always use default sales channel for sync
  const defaultSalesChannelId = 'sc_01K05XJND67JDXJY7DS38Y03TE'

  const medusaProductIds: string[] = transform({ medusaProducts }, (data) =>
    data.medusaProducts.map((product: ProductDTO) => product.id),
  )

  // Idempotent so we can just run it on everything
  // Consider changing in the future if thousands of products or getting throttled
  linkProductsToSalesChannelWorkflow.runAsStep({
    input: { id: defaultSalesChannelId, add: medusaProductIds },
  })

  return new WorkflowResponse({
    upsertedCount: medusaProductIds.length,
  })
})
