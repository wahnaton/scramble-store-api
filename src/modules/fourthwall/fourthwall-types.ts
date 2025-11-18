export interface FourthwallPaging {
  pageNumber: number
  pageSize: number
  elementsSize: number
  elementsTotal: number
  totalPages: number
  hasNextPage: boolean
}

export interface FourthwallCollection {
  id: string
  name: string
  slug: string
  description?: string
}

export interface FourthwallCollectionsResponse {
  results: FourthwallCollection[]
  paging: FourthwallPaging
}

export interface FourthwallVariant {
  id: string
  name: string
  unitPrice: { value: number; currency: string }
  compareAtPrice: number | null
  sku: string
  availableForSale: boolean
  attributes: {
    color?: { name?: string; swatch?: string }
    size?: { name?: string }
  }
  thumbnailImage: { url?: string; transformedUrl?: string }
  images: { url: string; transformedUrl: string }[]
}

export interface FourthwallProduct {
  id: string
  name: string
  description?: string
  slug: string
  thumbnailImage: { url: string; transformedUrl: string }
  images: { url: string }[]
  variants?: FourthwallVariant[]
}

export interface FourthwallCollectionProductsResponse {
  results: FourthwallProduct[]
}
