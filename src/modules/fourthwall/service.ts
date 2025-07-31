import { Lifetime } from "awilix"
import { MedusaError } from "@medusajs/utils"
import type { IProductModuleService, ISalesChannelModuleService } from "@medusajs/framework/types"
import { FourthwallClient, fourthwallClient, FourthwallProduct } from "./fourthwall-client"
import { Modules } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/medusa"
import { container } from "@medusajs/framework"

type InjectedDependencies = {
  logger: Logger
  product: IProductModuleService
  sales_channel: ISalesChannelModuleService
}

export default class FourthwallProductSyncService {
  static identifier = "fourthwall"
  static moduleName = "fourthwall"
  static LIFE_TIME = Lifetime.SCOPED

  protected readonly fourthwallClient_: FourthwallClient
  protected readonly logger_: any
  protected readonly productService_: IProductModuleService
  protected readonly salesChannelService_: ISalesChannelModuleService

  constructor({ logger, product, sales_channel }: InjectedDependencies) {
    this.fourthwallClient_ = fourthwallClient
    this.logger_ = logger
    this.productService_ = product
    this.salesChannelService_ = sales_channel
  }

  async syncProducts(): Promise<void> {
    try {
      const fourthwallProducts = await this.fourthwallClient_.listProducts()

      for (const fourthwallProduct of fourthwallProducts) {
        const productDTO = this.toCreateProductDTO_(fourthwallProduct)
        const existing = await this.productService_.listProducts(
          { external_id: [fourthwallProduct.id] },
          { relations: ["variants", "options"] }
        )

        

        if (existing.length === 0) {
          var createdProduct = await this.productService_.createProducts(productDTO)
          const link = container.resolve("link")

          var salesChannels = await this.salesChannelService_.listSalesChannels({
            name: "Default Sales Channel"
          })

          var defaultSalesChannel = salesChannels.at(0)?.id

          this.logger_.info(`defaultSalesChannel: ${defaultSalesChannel}`)

          await link.create({
              [Modules.PRODUCT]: {
                product_id: createdProduct.id,
              },
              [Modules.SALES_CHANNEL]: {
                // Hardcoded default sales channel
                sales_channel_id: defaultSalesChannel || "sc_01K05XJND67JDXJY7DS38Y03TE",
              },
            })

          this.logger_.info(`[FourthwallService] Created product: ${productDTO.title}`)
          continue
        }

        const existingProduct = existing[0]
        await this.productService_.updateProducts(existingProduct.id, {
          title: productDTO.title,
          handle: productDTO.handle,
          description: productDTO.description,
          status: productDTO.status,
          thumbnail: productDTO.thumbnail,
          external_id: productDTO.external_id,
          metadata: productDTO.metadata,
        })

        const current = await this.productService_.listProductVariants({ product_id: [existingProduct.id] })
        const byExt = new Map(
          current
            .filter((variant) => variant.metadata && typeof variant.metadata.external_id === "string")
            .map((variant) => [variant.metadata!.external_id, variant])
        )
        const bySku = new Map(current.filter((v) => !!v.sku).map((v) => [v.sku!, v]))

        const upserts = (productDTO.variants ?? []).map((variant: any) => {
          const ext = variant.metadata?.external_id
          const existing = (ext ? byExt.get(ext) : undefined) || (variant.sku ? bySku.get(variant.sku) : undefined)
          return {
            id: existing?.id,
            product_id: existingProduct.id,
            title: variant.title,
            sku: variant.sku,
            metadata: { external_id: ext },
          }
        })

        if (upserts.length) {
          await this.productService_.upsertProductVariants(upserts)
        }

        this.logger_.info(`[FourthwallService] Upserted product: ${productDTO.title}`)
      }

      this.logger_.info(`[FourthwallService] Synced ${fourthwallProducts.length} products`)
    } catch (error) {
      this.logger_.error("[FourthwallService] Sync failed", error)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Failed to sync Fourthwall products")
    }
  }

  private slugify_(s?: string) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  private toCreateProductDTO_(fourthwallProduct: FourthwallProduct) {
    const title = fourthwallProduct.title ?? "Untitled"
    const handle = fourthwallProduct.handle ?? this.slugify_(title)
    const images: string[] = fourthwallProduct.images.map((image) => image.url).filter(Boolean)

    return {
      title,
      handle,
      description: fourthwallProduct.description ?? "",
      status: "published" as const,
      thumbnail: images[0],
      external_id: fourthwallProduct.id,
      variants: fourthwallProduct.variants.map((variant) => ({
        title: variant.title ?? "Default",
        sku: variant.sku,
        options: {} as Record<string, string>,
        metadata: { external_id: variant.id },
      })),
      metadata: { fourthwall_handle: fourthwallProduct.handle ?? handle },
    }
  }
}