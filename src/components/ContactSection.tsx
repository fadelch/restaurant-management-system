"use client";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="scroll-mt-36 py-10 sm:scroll-mt-28 sm:py-16"
    >
      <div className="animate-[fadeInUp_0.8s_ease-out] rounded-2xl bg-neutral-900 p-5 text-white shadow-md sm:rounded-[2rem] sm:p-8 md:p-12">
        <h2 className="mb-5 text-3xl font-bold sm:text-4xl">Contact Us</h2>

        <div className="grid gap-6 text-base sm:text-lg md:grid-cols-3">
          <div>
            <h3 className="mb-2 font-bold">Phone</h3>

            <p className="break-words text-neutral-300">+961 XX XXX XXX</p>
          </div>

          <div>
            <h3 className="mb-2 font-bold">Address</h3>

            <p className="break-words text-neutral-300">
              Your restaurant address here
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-bold">Working Hours</h3>

            <p className="break-words text-neutral-300">
              Every day: 9:00 AM - 11:00 PM
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
