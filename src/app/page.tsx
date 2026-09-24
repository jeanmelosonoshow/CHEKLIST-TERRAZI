import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLandingPath } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? await getLandingPath(user) : "/login");
}
