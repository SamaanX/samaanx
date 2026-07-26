import { Suspense } from "react";

import {
  HomeCategoriesFallback,
  HomeCategoriesSection,
  HomeListingsFallback,
  HomeListingsSections,
  HomeTopSellersBlock,
  HomeTopSellersFallback,
} from "@/features/search/components/home-catalog-sections";
import { HomeHero } from "@/features/search/components/home-hero";
import {
  HomeCtaSection,
  WhyChooseSection,
} from "@/features/search/components/home-marketing";
import { HomeModeShell } from "@/features/search/components/home-mode-shell";
import { SellerHome } from "@/features/search/components/seller-home";
import { getCurrentProfile } from "@/lib/auth/guards";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo/json-ld";

export const metadata = {
  title: "Home",
  description:
    "Rent anything nearby or earn from idle items on SamaanX — Apki Cheez. Apki Income.",
};

/**
 * Home never awaits auth before catalog Suspense.
 * Mode comes from PreferredModeProvider (layout hydrator).
 */
export default function HomePage() {
  const buyer = (
    <div
      key="buyer-home"
      className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10"
    >
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <Suspense fallback={<HomeHero mode="BUYER" isAuthenticated={false} />}>
        <HomeHeroAuthed />
      </Suspense>

      <Suspense fallback={<HomeCategoriesFallback />}>
        <HomeCategoriesSection />
      </Suspense>

      <Suspense fallback={<HomeListingsFallback />}>
        <HomeListingsAuthed />
      </Suspense>

      <Suspense fallback={<HomeTopSellersFallback />}>
        <HomeTopSellersBlock />
      </Suspense>

      <Suspense
        fallback={
          <>
            <WhyChooseSection mode="BUYER" isAuthenticated={false} />
            <HomeCtaSection mode="BUYER" isAuthenticated={false} />
          </>
        }
      >
        <HomeMarketingAuthed />
      </Suspense>
    </div>
  );

  const seller = (
    <>
      <SellerHome />
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 pb-10 sm:px-6">
        <WhyChooseSection mode="SELLER" isAuthenticated />
        <HomeCtaSection mode="SELLER" isAuthenticated />
      </div>
    </>
  );

  return <HomeModeShell preferredMode="BUYER" buyer={buyer} seller={seller} />;
}

async function HomeHeroAuthed() {
  const profile = await getCurrentProfile();
  return <HomeHero mode="BUYER" isAuthenticated={Boolean(profile)} />;
}

async function HomeListingsAuthed() {
  const profile = await getCurrentProfile();
  return (
    <HomeListingsSections
      wishlistUserId={profile?.id ?? null}
      isAuthenticated={Boolean(profile)}
    />
  );
}

async function HomeMarketingAuthed() {
  const profile = await getCurrentProfile();
  const isAuthenticated = Boolean(profile);
  return (
    <>
      <WhyChooseSection mode="BUYER" isAuthenticated={isAuthenticated} />
      <HomeCtaSection mode="BUYER" isAuthenticated={isAuthenticated} />
    </>
  );
}
