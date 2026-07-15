// 자유게시판 게시글 상세 화면을 구성한다.
import PostDetail from "@/components/community/PostDetail";

export default function FreeBoardDetailPage() {
  return <PostDetail category="FREE" backHref="/boards/free" backLabel="자유게시판으로 돌아가기" />;
}
