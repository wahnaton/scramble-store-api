import { MedusaError } from '@medusajs/utils'
import type {
  FourthwallProduct,
  FourthwallCollectionProductsResponse,
  FourthwallCollectionsResponse,
} from './fourthwall-types'

type RequestOptions = {
  method: string
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
    this.baseUrl = (config.apiBase || 'https://storefront-api.fourthwall.com/v1').replace(/\/$/, '')
    this.storefrontToken = config.token || ''
  }

  async listProducts(): Promise<FourthwallProduct[]> {
    const cols = await this.request<FourthwallCollectionsResponse>('/collections', {
      method: 'GET',
    })
    const results: FourthwallProduct[] = []

    for (const c of cols?.results || []) {
      const col = await this.request<FourthwallCollectionProductsResponse>(
        `/collections/${encodeURIComponent(c.slug)}/products`,
        { method: 'GET' },
      )
      for (const p of col?.results || []) results.push(p)
    }

    return results
  }

  async retrieveProduct(id: string): Promise<FourthwallProduct> {
    return this.request<{ product: FourthwallProduct }>(`/products/${id}`, {
      method: 'GET',
    }).then((responseBody) => responseBody.product)
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    if (!this.storefrontToken) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Missing FOURTHWALL_STOREFRONT_TOKEN')
    }
    const requestUrl = new URL(this.baseUrl + path)
    requestUrl.searchParams.set('storefront_token', this.storefrontToken)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          requestUrl.searchParams.set(key, String(value))
        }
      }
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body)
    }

    const response = await fetch(requestUrl.toString(), requestInit)
    let responseBody: unknown
    try {
      responseBody = await response.json()
    } catch {
      responseBody = undefined
    }

    if (!response.ok) {
      const message = `Fourthwall request failed: ${response.status}`
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return responseBody as T
  }
}

export const createFourthwallClient = (config?: {
  apiBase?: string
  token?: string
}): FourthwallClient => new FourthwallClient(config as { apiBase: string; token: string })

export const fourthwallClient = createFourthwallClient({
  apiBase: process.env.FOURTHWALL_API_BASE || 'https://storefront-api.fourthwall.com/v1',
  token: process.env.FOURTHWALL_STOREFRONT_TOKEN || '',
})
