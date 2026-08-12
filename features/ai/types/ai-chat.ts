export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiParsedIntent = {
  keywords: string;
  categorySlug: string | null;
  city: string | null;
  priceMax: number | null;
  rentDays: number | null;
  isGeneralQuestion: boolean;
};

export type AiListingGrounding = {
  title: string;
  slug: string;
  categoryName: string;
  city: string;
  area: string;
  priceAmount: number;
  priceUnit: string;
  currency: string;
  descriptionSnippet: string;
  depositNote: string | null;
};

export type AiChatSuccess = {
  message: string;
};
