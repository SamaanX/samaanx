import type { AiParsedIntent } from "@/features/ai/types/ai-chat";
import type { CategoryOption } from "@/features/listings/types/listing";

const PK_CITIES = [
  "lahore",
  "karachi",
  "islamabad",
  "rawalpindi",
  "faisalabad",
  "multan",
  "peshawar",
  "quetta",
  "sialkot",
  "gujranwala",
  "hyderabad",
  "bahawalpur",
] as const;

const GENERAL_PATTERNS = [
  /^what can i rent/i,
  /^what is samaanx/i,
  /^how does samaanx work/i,
  /^tell me about samaanx/i,
  /^what do you do/i,
  /^who are you/i,
];

function parseBudget(message: string): number | null {
  const patterns = [
    /(?:under|below|max|upto|up to|less than)\s*(?:rs\.?|pkr)?\s*([\d,]+)/i,
    /(?:rs\.?|pkr)\s*([\d,]+)\s*(?:\/\s*day|per day|daily)?/i,
    /([\d,]+)\s*(?:rs\.?|pkr)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}

function parseCity(message: string): string | null {
  const lower = message.toLowerCase();

  for (const city of PK_CITIES) {
    if (lower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  const inCity = lower.match(/\bin\s+([a-z][a-z\s-]{2,30})/i);
  if (inCity?.[1]) {
    const candidate = inCity[1].trim().split(/\s+/)[0];
    if (candidate && candidate.length > 2) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  return null;
}

function parseRentDays(message: string): number | null {
  const dayMatch = message.match(/(\d+)\s*(?:day|days)/i);
  if (dayMatch?.[1]) {
    const days = Number(dayMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return days;
    }
  }

  if (/\bweek\b/i.test(message)) return 7;
  if (/\bmonth\b/i.test(message)) return 30;

  return null;
}

function parseCategorySlug(
  message: string,
  categories: CategoryOption[],
): string | null {
  const lower = message.toLowerCase();

  for (const category of categories) {
    const name = category.name.toLowerCase();
    const slug = category.slug.toLowerCase();
    if (lower.includes(name) || lower.includes(slug.replace(/-/g, " "))) {
      return category.slug;
    }
  }

  const productHints: Record<string, string[]> = {
    camera: ["camera", "cameras", "dslr", "photography"],
    laptop: ["laptop", "laptops", "notebook", "macbook"],
    phone: ["phone", "mobile", "iphone", "smartphone"],
    projector: ["projector", "projectors"],
    drone: ["drone", "drones"],
    bike: ["bike", "bicycle", "cycle"],
    car: ["car", "vehicle", "sedan"],
  };

  for (const [slugHint, words] of Object.entries(productHints)) {
    if (words.some((word) => lower.includes(word))) {
      const match = categories.find(
        (c) =>
          c.slug.includes(slugHint) || c.name.toLowerCase().includes(slugHint),
      );
      if (match) return match.slug;
    }
  }

  return null;
}

function buildKeywords(message: string, city: string | null): string {
  let text = message.toLowerCase();

  for (const cityName of PK_CITIES) {
    text = text.replace(new RegExp(cityName, "gi"), " ");
  }

  text = text
    .replace(
      /\b(under|below|max|upto|up to|less than|rs\.?|pkr|per day|daily|for rent|rent|rental|rentals|find|show|need|want|something|me|in|on|samaanx|please|a|an|the)\b/gi,
      " ",
    )
    .replace(/[\d,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (city) {
    text = text.replace(new RegExp(city, "gi"), " ").trim();
  }

  return text.slice(0, 120);
}

export function parseUserIntent(
  message: string,
  categories: CategoryOption[],
): AiParsedIntent {
  const trimmed = message.trim();
  const isGeneralQuestion = GENERAL_PATTERNS.some((pattern) =>
    pattern.test(trimmed),
  );

  const city = parseCity(trimmed);
  const categorySlug = parseCategorySlug(trimmed, categories);
  const priceMax = parseBudget(trimmed);
  const rentDays = parseRentDays(trimmed);
  const keywords = buildKeywords(trimmed, city);

  return {
    keywords,
    categorySlug,
    city,
    priceMax,
    rentDays,
    isGeneralQuestion,
  };
}
