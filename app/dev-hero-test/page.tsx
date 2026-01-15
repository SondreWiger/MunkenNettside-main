import Link from "next/link"
import RawImageTest from "@/components/dev/raw-image-test"

export default function DevHeroTest({ searchParams }: { searchParams?: { src?: string } }) {
  const src = searchParams?.src ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Dev: Hero Image Test</h1>
        <p className="mb-4 text-muted-foreground">Paste the image URL you see in devtools into <code className="bg-background px-1 rounded">?src=</code> and reload this page to inspect.</p>
        <p className="mb-4">Example: <Link className="underline" href="/dev-hero-test?src=https://framerusercontent.com/images/XYZ">/dev-hero-test?src=&lt;your-image-url&gt;</Link></p>

        <RawImageTest src={src} />
      </div>
    </div>
  )
}
