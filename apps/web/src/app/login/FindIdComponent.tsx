import Modal from "../_components/modalComponent";

export default function FindIdComponent({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="mb-5 text-xl font-black text-slate-950">아이디 찾기</h2>
      <form className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          가입한 이메일을 입력하면 아이디 안내 메일을 받을 수 있습니다.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
          <input type="email" required className="input-style" />
        </div>
        <button type="submit" className="button-primary">
          안내 메일 받기
        </button>
      </form>
    </Modal>
  );
}
