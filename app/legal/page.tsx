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
		<div className="flex flex-col min-h-screen bg-background">
			<Header />
			<main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
				<div className="w-full max-w-2xl bg-white rounded-xl shadow p-8 border border-muted">
					<h1 className="text-3xl font-bold mb-8 text-center">
						Juridiske dokumenter
					</h1>
					<ul className="space-y-4">
						{legalDocs.map((doc) => (
							<li key={doc.slug}>
								<Link
									href={`/legal/${doc.slug}`}
									className="block text-lg font-medium text-blue-600 hover:underline px-4 py-3 rounded transition-colors hover:bg-muted"
								>
									{doc.title}
								</Link>
							</li>
						))}
					</ul>
				</div>
			</main>
			<Footer />
		</div>
	);
}
