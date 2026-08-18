"use client";

export default function AboutSection() {
  return (
    <section id="about" className="scroll-mt-36 py-10 sm:scroll-mt-28 sm:py-16">
      <div className="animate-[fadeInUp_0.8s_ease-out] rounded-2xl bg-white p-5 shadow-md dark:bg-neutral-900 sm:rounded-[2rem] sm:p-8 md:p-12">
        <h2 className="mb-4 text-3xl font-bold sm:mb-5 sm:text-4xl">
          About Us
        </h2>

        <p className="text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
          We serve high-quality meals prepared with fresh ingredients and real
          passion. Our restaurant combines great taste, a cozy environment, and
          a menu that offers something for everyone.
        </p>
      </div>
    </section>
  );
}
