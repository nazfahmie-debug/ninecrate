export interface ProductVariant {
  sku: string;
  label: string;
  price: number;
  images: string[];
}

export interface ProductListing {
  sourceId: string;
  sourceUrl: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  variants: ProductVariant[];
}

export interface TikTokContent {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
}

export interface TikTokContentRecord {
  sourceId: string;
  content: TikTokContent;
  generatedAt: string;
}
