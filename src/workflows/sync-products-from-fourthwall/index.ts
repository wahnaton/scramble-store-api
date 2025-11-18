import { createWorkflow, transform, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import {
  linkProductsToSalesChannelWorkflow,
  upsertVariantPricesWorkflow,
  batchImageVariantsWorkflow,
} from '@medusajs/medusa/core-flows'
import { ProductDTO, UpsertProductDTO } from '@medusajs/types'
import { fetchFourthwallProductsStep } from './steps/fetch-fourthwall-products'
import { mapFourthwallToMedusaIdsStep } from './steps/map-existing-product-ids'
import { createMedusaUpserts as createMedusaUpserts } from './steps/create-medusa-upserts'
import { upsertMedusaProductsStep as upsertMedusaProductsStep } from './steps/upsert-medusa-products'
import { createVariantPriceUpsertsStep } from './steps/create-variant-price-upserts'
import { FourthwallProduct as FourthwallProduct } from '../../modules/fourthwall/fourthwall-types'
import { prepareMedusaImagePayloadsStep } from './steps/prepare-medusa-image-payloads'
import { createMedusaImagesStep } from './steps/create-medusa-images'
import { buildVariantImageLinksStep } from './steps/build-variant-image-links'

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

  // Prepare per-product image payloads
  const imagePayloads = prepareMedusaImagePayloadsStep({
    fourthwallProducts,
    fourthwallProductIdToMedusaProductIdMap,
  })

  // Ensure Medusa images exist and map urls -> image ids (idempotent)
  const medusaImageMap = createMedusaImagesStep({
    medusaProducts,
    imagePayloads,
  })

  // Build map directly from Fourthwall variants to Medusa image ids
  const variantImageLinks = buildVariantImageLinksStep({
    fourthwallProducts,
    medusaProducts,
    medusaImageMap,
  })

  for (const link of variantImageLinks.links) {
    batchImageVariantsWorkflow.runAsStep({
      input: {
        image_id: link.imageId,
        add: link.variantIds,
      },
    })
  }

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
