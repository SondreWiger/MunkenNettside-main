import { redirect } from "next/navigation"

export default function BilletterPage() {
  redirect("/dashboard?tab=tickets")
}