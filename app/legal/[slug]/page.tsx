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
  vilkar: `## Vilkår for kjøp

### 1. Generelt
Ved kjøp av billetter eller opptak gjennom Teateret aksepterer du disse vilkårene.

### 2. Betaling
Alle priser er i norske kroner inkludert mva. Betaling skjer via PayPal eller andre godkjente betalingsmetoder.

### 3. Avbestilling
Billetter kan avbestilles frem til 24 timer før forestilling for full refundering.

### 4. Ansvar
Teateret er ikke ansvarlig for tap som følge av avlysning utover billettpris.

### 5. Personvern
Dine personopplysninger behandles i henhold til vår personvernerklæring.`,
  personvern: `## Personvernerklæring

*Sist oppdatert: Januar 2026*

### 1. Dataansvarlig
**Teateret** er dataansvarlig for behandling av dine personopplysninger.
**Kontakt:** [kontakt@teateret.no]

### 2. Hvilke opplysninger vi samler
Vi samler følgende personopplysninger:
- **Kontaktinfo:** Navn, e-post, telefon
- **Betalingsinfo:** PayPal-konto (ikke kortnumre)
- **Bruksdata:** Billetthistorikk, preferanser
- **Teknisk data:** IP-adresse, cookies, enhetsinformasjon
- **Barn:** Fødselsdato (kun for familiekontoer)

### 3. Hvorfor vi bruker opplysningene
- **Tjenesteyting:** Levere billetter og opptak (Artikkel 6(1)b GDPR)
- **Kommunikasjon:** Bekreftelser og kundeservice (Artikkel 6(1)b GDPR)
- **Familiekontoer:** Beskytte barn online (Artikkel 6(1)f GDPR)
- **Markedsføring:** Med ditt samtykke (Artikkel 6(1)a GDPR)
- **Statistikk:** Forbedre tjenesten (Artikkel 6(1)f GDPR)

### 4. Deling av opplysninger
Vi deler ikke personopplysninger med tredjeparter utenom:
- **PayPal:** For betalingsbehandling
- **Supabase:** Database og autentisering (EU-basert)
- **Vercel:** Hosting og analytics (GDPR-kompatibel)

### 5. Lagring og sletting
- **Aktive kontoer:** Så lenge kontoen er aktiv
- **Billetthistorikk:** 5 år etter kjøp (skattemessige krav)
- **Markedsføringssamtykke:** Til du trekker samtykke
- **Barn:** Data slettes ved 18 års alder eller på forespørsel

### 6. Dine rettigheter
Du har rett til å:
- **Se** hvilke data vi har om deg
- **Rette** feil i dataene
- **Slette** kontoen din og tilknyttede data
- **Eksportere** dine data
- **Begrense** behandling
- **Trekke samtykke** til markedsføring
- **Klage** til Datatilsynet

### 7. Cookies
Vi bruker nødvendige cookies for:
- **Autentisering:** Holde deg logget inn
- **Preferanser:** Språk og tema
- **Analytics:** Anonymisert bruksstatistikk

Du kan administrere cookies i innstillingene.

### 8. Barn under 16 år
- Krever foreldresamtykke for registrering
- Begrenset datainnsamling
- Foreldrekontroll via familiekontoer

### 9. Dataoverføring
Dine data behandles i EU/EØS-området.

### 10. Kontakt
For spørsmål: [personvern@teateret.no]
Datatilsynet: [www.datatilsynet.no]`,
  eula: `## Sluttbrukeravtale (EULA)

### 1. Lisensavtale
Denne avtalen regulerer din bruk av Teateret-plattformen.

### 2. Tildelte rettigheter
Du får en begrenset, ikke-eksklusiv rett til å:
- Bruke plattformen til personlig bruk
- Se kjøpte opptak
- Administrere din profil

### 3. Begrensninger
Du kan ikke:
- Kopiere eller distribuere opptak
- Misbruke eller hacke systemet
- Bruke automatiserte verktøy
- Krenke andres rettigheter

### 4. Immaterielle rettigheter
Alt innhold tilhører Teateret eller lisensgivere.

### 5. Ansvarsbegrensning
Teateret er ikke ansvarlig for indirekte skader.

### 6. Oppsigelse
Vi kan suspendere kontoer ved brudd på vilkårene.

### 7. Endringer
Vi kan oppdatere denne avtalen med 30 dagers varsel.`,
  tos: `## Vilkår for bruk (TOS)

### 1. Akseptert bruk
Plattformen er for lovlig bruk knyttet til teater og kulturopplevelser.

### 2. Registrering
- Du må oppgi korrekt informasjon
- Du er ansvarlig for kontosikkerhet
- Familiekontoer krever foreldreansvar

### 3. Innhold og oppførsel
- Vær respektfull mot andre brukere
- Ikke publiser upassende innhold
- Respekter opphavsrett

### 4. Tjenestens tilgjengelighet
- Tjenesten leveres "som den er"
- Vi kan utføre vedlikehold
- Ingen garanti for kontinuerlig tilgang

### 5. Endringer
Vi forbeholder oss retten til å endre:
- Tjenestens funksjonalitet
- Priser og vilkår
- Disse bruksvilkårene

### 6. Kontakt
Spørsmål: [support@teateret.no]`
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
