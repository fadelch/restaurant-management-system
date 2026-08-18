"use client";

export default function HeroSection() {
  return (
    <section id="top" className="scroll-mt-36 py-8 sm:scroll-mt-28 sm:py-10">
      <div className="max-w-5xl">
        <span className="inline-block rounded-full bg-red-100 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300 sm:px-4 sm:text-base">
          Welcome to our restaurant
        </span>

        <h1 className="mt-6 break-words text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          Delicious food,
          <br />
          warm atmosphere,
          <br />
          unforgettable taste.
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
          Explore our menu, discover fresh meals, and enjoy a modern dining
          experience made for every taste.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#menu"
            className="cursor-pointer rounded-xl bg-red-600 px-6 py-3 text-center font-bold text-white transition hover:bg-red-700"
          >
            View Menu
          </a>

          <a
            href="#about"
            className="cursor-pointer rounded-xl border border-neutral-300 px-6 py-3 text-center font-bold transition hover:bg-gray-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
