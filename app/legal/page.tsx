import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const legalDocs = [
	{ slug: "vilkar", title: "Vilkår for kjøp" },
	{ slug: "personvern", title: "Personvernerklæring" },
	{ slug: "eula", title: "Sluttbrukeravtale (EULA)" },
	{ slug: "tos", title: "Vilkår for bruk (TOS)" },
];

export default function LegalDashboard() {
	return (
		<div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--fg)]">
			<Header />

			<main className="flex-1 flex flex-col items-center py-20 px-4">
				<div className="w-full max-w-3xl bg-[var(--card)] rounded-xl shadow-soft p-10 border border-[var(--muted)]">
					<h1 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-center">Juridiske dokumenter</h1>
					<p className="text-[var(--muted)] text-center mb-6">Vennligst les våre vilkår og personvernregler før du bruker tjenestene våre.</p>

					<ul className="grid gap-3">
						{legalDocs.map((doc) => (
							<li key={doc.slug}>
								<Link
									href={`/legal/${doc.slug}`}
									className="block px-4 py-3 rounded-md hover:bg-[var(--bg)] transition-colors text-[var(--muted)] font-medium focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20"
									aria-label={`Åpne dokument: ${doc.title}`}
								>
									<div className="flex items-center justify-between">
										<span>{doc.title}</span>
										<span className="text-sm text-[var(--muted-foreground)]">Les mer</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</div>
			</main>

			<Footer />
		</div>
	)
}
