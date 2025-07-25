import { Lifetime } from "awilix"
import { MedusaError } from "@medusajs/utils"
import { FourthwallClient, fourthwallClient, FourthwallProduct } from "./fourthwall-client"

type InjectedDependencies = {
  logger: any
}

export default class FourthwallService {
  static LIFE_TIME = Lifetime.SCOPED

  protected readonly client_: FourthwallClient
  protected readonly logger_: any

  // TODO: Move products_ to persistent storage using shared `catalog_products` and `catalog_variants` tables in Neon Postgres
  private products_: FourthwallProduct[] = []

  constructor({ logger }: InjectedDependencies) {
    this.client_ = fourthwallClient
    this.logger_ = logger
  }

  async syncAll(): Promise<void> {
    try {
      this.products_ = await this.client_.listProducts()
      this.logger_.info(`[FourthwallService] Synced ${this.products_.length} products`)
      // TODO: Syncing should eventually upsert products and variants into shared `catalog_products` and `catalog_variants` tables in Neon Postgres
    } catch (error) {
      this.logger_.error("[FourthwallService] Sync failed", error)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Failed to sync Fourthwall products")
    }
  }

  async getList(): Promise<FourthwallProduct[]> {
    // TODO: Currently returns from memory, should later query from shared `catalog_products` in Neon Postgres
    return this.products_
  }

  async getById(id: string): Promise<FourthwallProduct> {
    // TODO: Replace with lookup from shared `catalog_products` table in Neon Postgres
    const match = this.products_.find((product) => product.id === id || product.handle === id)
    if (!match) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
    }
    return match
  }

  async createCheckoutSession(
    items: { variant_id: string; quantity: number }[]
  ): Promise<{ redirect_url: string }> {
    // TODO: Persist created cartId + items to Neon Postgres, referencing shared `catalog_products` and `catalog_variants` tables for saved/abandoned carts
    // TODO: Reuse existing open cart if available, using shared Neon storage
    const cart = await this.client_.createCart(
      items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
      }))
    )

    const redirect_url = `https://checkout.playscramblegame.com/checkout/?cartCurrency=${cart.currency}&cartId=${cart.id}`

    return { redirect_url }
  }
}