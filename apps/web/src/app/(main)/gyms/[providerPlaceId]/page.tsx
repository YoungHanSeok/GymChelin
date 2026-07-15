// 이전 헬스장 상세 주소는 검색 데이터가 유지되는 통합 지도 화면으로 이동한다.
import { redirect } from "next/navigation";

export default function LegacyGymDetailPage() {
  redirect("/gyms");
}
