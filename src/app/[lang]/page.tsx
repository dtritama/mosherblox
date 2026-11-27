import { BannerCarousel } from "@/components/sections/banner-carousel";
import { Faq } from "@/components/sections/faq";
import { Features } from "@/components/sections/features";
import { FlashSale } from "@/components/sections/flash-sale";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { LeaderboardSection } from "@/components/sections/leaderboard-section";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { RobuxSection } from "@/components/sections/robux-section";
import { ShopSection } from "@/components/sections/shop-section";
import { resolveBanners } from "@/lib/banners";
import { getRecentDeliveries } from "@/server/recent-deliveries";
import { getSiteContent } from "@/server/site-content";

export default async function HomePage() {
  const [{ banners }, deliveries] = await Promise.all([getSiteContent(), getRecentDeliveries()]);
  return (
    <>
      <Hero deliveries={deliveries} />
      <BannerCarousel banners={resolveBanners(banners)} />
      <RobuxSection />
      <ShopSection />
      <FlashSale />
      <Features />
      <HowItWorks />
      <LeaderboardSection />
      <ReviewsSection />
      <Faq />
    </>
  );
}
