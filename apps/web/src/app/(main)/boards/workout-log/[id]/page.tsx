// 운동 일지 게시글 상세 화면을 구성한다.
import PostDetail from "@/components/community/PostDetail";

export default function WorkoutLogDetailPage() {
  return <PostDetail category="WORKOUT_LOG" backHref="/boards/workout-log" backLabel="운동일지로 돌아가기" />;
}
