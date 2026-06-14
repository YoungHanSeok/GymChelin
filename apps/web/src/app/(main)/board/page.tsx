import { redirect } from "next/navigation";

export default function LegacyBoardPage() {
  redirect("/boards/free");
}
