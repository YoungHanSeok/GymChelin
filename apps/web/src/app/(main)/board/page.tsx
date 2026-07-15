// 이전 게시판 주소를 자유게시판으로 연결한다.
import { redirect } from "next/navigation";

export default function LegacyBoardPage() {
  redirect("/boards/free");
}
