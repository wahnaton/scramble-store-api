import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import {
  linkProductsToSalesChannelWorkflow,
  upsertVariantPricesWorkflow,
} from '@medusajs/medusa/core-flows'
import { ProductDTO, UpsertProductDTO } from '@medusajs/types'
import { fetchFourthwallProductsStep } from './steps/fetch-fourthwall-products'
import { mapFourthwallToMedusaIdsStep } from './steps/map-existing-product-ids'
import { createMedusaUpserts as createMedusaUpserts } from './steps/create-medusa-upserts'
import { upsertMedusaProductsStep as upsertMedusaProductsStep } from './steps/upsert-medusa-products'
import { createVariantPriceUpsertsStep } from './steps/create-variant-price-upserts'
import { FourthwallProduct as FourthwallProduct } from '../../modules/fourthwall/fourthwall-types'

export const syncProductsFromFourthwall = createWorkflow('sync-products-from-fourthwall', () => {
  // Call Fourthwall API to get products
  const fourthwallProducts: FourthwallProduct[] = fetchFourthwallProductsStep()

  // Map Fourthwall product and variant ids to the existing Medusa ids we sync against
  const fourthwallToMedusaIdMaps = mapFourthwallToMedusaIdsStep({ fourthwallProducts })

  const fourthwallProductIdToMedusaProductIdMap: Record<string, string> =
    fourthwallToMedusaIdMaps.fourthwallProductIdToMedusaProductId

  const fourthwallVariantIdToMedusaVariantIdMap: Record<string, string> =
    fourthwallToMedusaIdMaps.fourthwallVariantIdToMedusaVariantId

  // Convert Fourthwall products to Medusa products
  const medusaProductUpserts: UpsertProductDTO[] = createMedusaUpserts({
    fourthwallProducts,
    fourthwallProductIdToMedusaProductIdMap,
    fourthwallVariantIdToMedusaVariantIdMap,
  })

  const medusaProducts: ProductDTO[] = upsertMedusaProductsStep({ medusaProductUpserts })

  // Add Fourthwall variant prices to their corresponding Medusa variants
  const variantPricePreparation = createVariantPriceUpsertsStep({
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

  // Add Fourthwall variant images to their corresponding Medusa variants
  // const variantImages: // Some step that returns this type BatchImageVariantsWorkflowInput
  // batchImageVariantsWorkflow.runAsStep({
  //   input: { variantImages },
  // })

  // Always use default sales channel for sync
  const defaultSalesChannelId = 'sc_01K05XJND67JDXJY7DS38Y03TE'

  const medusaProductIds: string[] = transform({ medusaProducts }, (data) =>
    data.medusaProducts.map((product: ProductDTO) => product.id),
  )

  // Sales channel is required for Medusa Products
  // Idempotent so run on everything but change if thousands of products or getting throttled
  linkProductsToSalesChannelWorkflow.runAsStep({
    input: { id: defaultSalesChannelId, add: medusaProductIds },
  })

  return new WorkflowResponse({
    upsertedCount: medusaProductIds.length,
  })
})
