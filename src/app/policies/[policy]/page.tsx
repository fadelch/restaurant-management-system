import Link from "next/link";
import { notFound } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import Footer from "@/components/Footer";
import {
  customerPolicies,
  getCustomerPolicy,
} from "@/data/customerPolicies";

export function generateStaticParams() {
  return customerPolicies.map((policy) => ({ policy: policy.slug }));
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy: slug } = await params;
  const policy = getCustomerPolicy(slug);
  if (!policy) notFound();

  return (
    <div className="min-h-dvh bg-[#080808] text-white">
      <Nav_bar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-black text-amber-200">
          DRAFT — REQUIRES OWNER / LEGAL REVIEW
        </div>
        <header className="py-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">Customer policy template</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{policy.title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-gray-300">{policy.summary}</p>
        </header>
        <div className="space-y-5">
          {policy.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-7">
              <h2 className="text-xl font-black text-red-200 sm:text-2xl">{section.heading}</h2>
              <div className="mt-4 space-y-3 leading-7 text-gray-300">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-gray-400">
          <Link href="/" className="font-bold text-red-300 hover:underline">Return to the restaurant</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
