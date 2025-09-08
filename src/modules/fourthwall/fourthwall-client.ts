import { MedusaError } from "@medusajs/utils"

export interface FourthwallVariant {
  id: string
  title: string
  // Source of truth for selling price on Fourthwall
  unitPrice: { value: number; currency: string }
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

  constructor(config: { apiBase: string; token: string }) {
    this.baseUrl = (config.apiBase || "https://storefront-api.fourthwall.com/v1").replace(/\/$/, "")
    this.storefrontToken = config.token || ""
  }

  async listProducts(): Promise<FourthwallProduct[]> {
    const cols = await this.request<{ results: any[] }>("/collections")
    const results: any[] = []

    for (const c of cols?.results || []) {
      const col = await this.request<{ results: any[] }>(
        `/collections/${encodeURIComponent(c.slug)}/products`
      )
      for (const p of col?.results || []) results.push(p)
    }

    const mapped: FourthwallProduct[] = results.map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      handle: p.slug,
      images: (p.images || []).map((im: any) => ({ url: im.url })).filter((i: any) => !!i.url),
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        title: v.name,
        unitPrice: {
          value: (v?.unitPrice?.value ?? v?.price) as number,
          currency: (v?.unitPrice?.currency ?? p?.currency ?? "USD") as string,
        },
        compareAtPrice: v?.compareAtPrice ?? null,
        sku: v.sku,
        availableForSale: v.availableForSale,
      })),
    }))

    return mapped
  }

  async retrieveProduct(id: string): Promise<FourthwallProduct> {
    return this.request<{ product: FourthwallProduct }>(`/products/${id}`).then(
      (responseBody) => responseBody.product
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
    const requestBody: any = { items }
    if (currency) {
      requestBody.currency = currency
    }
    return this.request<{ cart: FourthwallCart }>("/carts", {
      method: "POST",
      body: requestBody,
    }).then((responseBody) => responseBody.cart)
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    if (!this.storefrontToken) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing FOURTHWALL_STOREFRONT_TOKEN")
    }
    const requestUrl = new URL(this.baseUrl + path)
    requestUrl.searchParams.set("storefront_token", this.storefrontToken)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          requestUrl.searchParams.set(key, String(value))
        }
      }
    }

    const requestInit: RequestInit = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body)
    }

    const response = await fetch(requestUrl.toString(), requestInit)
    let responseBody: any
    try {
      responseBody = await response.json()
    } catch {
      responseBody = undefined
    }

    if (!response.ok) {
      const message =
        responseBody?.message ||
        responseBody?.error ||
        `Fourthwall request failed: ${response.status}`
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return responseBody as T
  }
}

export const createFourthwallClient = (config?: { apiBase?: string; token?: string }) => new FourthwallClient(config as { apiBase: string; token: string })

export const fourthwallClient = createFourthwallClient({
  apiBase: process.env.FOURTHWALL_API_BASE || "https://storefront-api.fourthwall.com/v1",
  token: process.env.FOURTHWALL_STOREFRONT_TOKEN || "",
})
