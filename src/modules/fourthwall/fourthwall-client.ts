

import { MedusaError } from "@medusajs/utils"

export interface FourthwallVariant {
  id: string
  title: string
  price: number
  sku?: string
  availableForSale?: boolean
}

export interface FourthwallProduct {
  id: string
  title: string
  description?: string
  handle?: string
  images: { url: string }[]
  variants: FourthwallVariant[]
}

export interface CreateCartItem {
  variant_id: string
  quantity: number
}

export interface FourthwallCart {
  id: string
  currency: string
  items: Array<{
    variant_id: string
    quantity: number
  }>
}

type RequestOptions = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined>
}

/**
 * Thin HTTP wrapper around Fourthwall Storefront API.
 * Reads configuration from environment variables:
 * - FOURTHWALL_API_BASE (optional) e.g. https://storefront-api.fourthwall.com/v1
 * - FOURTHWALL_STOREFRONT_TOKEN (required) provided by Fourthwall
 */
export class FourthwallClient {
  private readonly baseUrl: string
  private readonly storefrontToken: string

  constructor() {
    this.baseUrl =
      process.env.FOURTHWALL_API_BASE?.replace(/\/$/, "") ||
      "https://storefront-api.fourthwall.com/v1"

    this.storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN || ""
    if (!this.storefrontToken) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "FOURTHWALL_STOREFRONT_TOKEN env var is required"
      )
    }
  }

  async listProducts(): Promise<FourthwallProduct[]> {
    const res = await this.request<{ products: FourthwallProduct[] }>(
      "/products"
    )
    return res.products
  }

  async retrieveProduct(id: string): Promise<FourthwallProduct> {
    return this.request<{ product: FourthwallProduct }>(`/products/${id}`).then(
      (r) => r.product
    )
  }

  /**
   * Creates a cart on Fourthwall. You must redirect user to hosted checkout:
   *   https://<your_checkout_domain>/checkout/?cartCurrency=<currency>&cartId=<cartId>
   */
  async createCart(
    items: CreateCartItem[],
    currency?: string
  ): Promise<FourthwallCart> {
    const body: any = { items }
    if (currency) {
      body.currency = currency
    }
    return this.request<{ cart: FourthwallCart }>("/carts", {
      method: "POST",
      body,
    }).then((r) => r.cart)
  }

  private async request<T>(
    path: string,
    opts: RequestOptions = {}
  ): Promise<T> {
    const url = new URL(this.baseUrl + path)
    url.searchParams.set("storefront_token", this.storefrontToken)
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) {
          url.searchParams.set(k, String(v))
        }
      }
    }

    const init: RequestInit = {
      method: opts.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body)
    }

    const response = await fetch(url.toString(), init)
    let payload: any
    try {
      payload = await response.json()
    } catch {
      payload = undefined
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Fourthwall request failed: ${response.status}`
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return payload as T
  }
}

export const fourthwallClient = new FourthwallClient()