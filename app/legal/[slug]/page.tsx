import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const legalDocs = [
  { slug: "vilkar", title: "Vilkår for kjøp" },
  { slug: "personvern", title: "Personvernerklæring" },
  { slug: "eula", title: "Sluttbrukeravtale (EULA)" },
  { slug: "tos", title: "Vilkår for bruk (TOS)" },
];

const legalContent: Record<string, string> = {
  vilkar: `## Vilkår for kjøp\n\nHer kommer vilkår for kjøp.`,
  personvern: `## Personvernerklæring\n\nHer kommer personvernerklæringen.`,
  eula: `## Sluttbrukeravtale (EULA)\n\nHer kommer sluttbrukeravtalen.`,
  tos: `## Vilkår for bruk (TOS)\n\nHer kommer vilkår for bruk.`
};

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocs.find((d) => d.slug === slug);
  if (!doc) return notFound();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Sidepanel */}
        <aside className="hidden md:block w-64 border-r bg-gray-50 p-6">
          <nav>
            <ul className="space-y-2">
              {legalDocs.map((d) => (
                <li key={d.slug}>
                  <Link href={`/legal/${d.slug}`} className={`block px-2 py-1 rounded hover:bg-gray-200 ${d.slug === slug ? "bg-gray-200 font-bold" : ""}`}>{d.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        {/* Main content */}
        <main className="flex-1 p-8 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{doc.title}</h1>
          <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: legalContent[slug]?.replace(/\n/g, "<br />") || "" }} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
