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

export interface FourthwallApiVariant {
  id: string
  name: string
  unitPrice?: { value?: number; currency?: string }
  price?: number
  compareAtPrice?: number | null
  sku?: string
  availableForSale?: boolean
  attributes?: {
    color?: { name?: string; swatch?: string }
    size?: { name?: string }
  }
}

export interface FourthwallApiProduct {
  id: string
  name: string
  description?: string
  slug?: string
  currency?: string
  thumbnailImage?: { url?: string; transformedUrl?: string }
  images?: { url?: string }[]
  variants?: FourthwallApiVariant[]
}

export interface FourthwallCollectionProductsResponse {
  results: FourthwallApiProduct[]
}

export interface FourthwallVariant {
  id: string
  title: string
  // Source of truth for selling price on Fourthwall
  unitPrice: { value: number; currency: string }
  sku?: string
  availableForSale?: boolean
  colorName?: string
  colorSwatch?: string
  sizeName?: string
}

export interface FourthwallProduct {
  id: string
  title: string
  description?: string
  handle?: string
  thumbnail?: string
  images?: { url: string }[]
  variants: FourthwallVariant[]
}
