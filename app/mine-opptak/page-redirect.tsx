import { redirect } from "next/navigation"

export default function MineOpptakPage() {
  redirect("/dashboard?tab=purchases")
}