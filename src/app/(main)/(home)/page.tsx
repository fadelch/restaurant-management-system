import { Suspense } from "react";
import HomePageShell from "@/components/HomePageShell";
import HomeMenuContent from "@/components/HomeMenuContent";
import { getFoods } from "@/server/getFoods";
import { getFavoriteState } from "@/server/favorites";

async function HomeMenuData() {
  const [foods, favoriteState] = await Promise.all([
    getFoods().catch(() => []),
    getFavoriteState().catch(() => ({
      authenticated: false,
      foodIds: [] as string[],
    })),
  ]);

  return (
    <HomeMenuContent
      foods={foods}
      initialFavoriteFoodIds={favoriteState.foodIds}
      authenticated={favoriteState.authenticated}
    />
  );
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-2xl bg-neutral-800 shadow-md sm:h-80 sm:rounded-3xl"
        />
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <HomePageShell
      menu={
        <Suspense fallback={<MenuSkeleton />}>
          <HomeMenuData />
        </Suspense>
      }
    />
  );
}
