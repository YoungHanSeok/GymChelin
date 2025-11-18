import Link from "next/link";
import Modal from "../_components/modalComponent";

const SignUpModal = ({ onClose }: { onClose: () => void }) => {
    return (
    <Modal onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-semibold">회원가입</h2>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            이메일
          </label>
          <input type="email" required className="input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            닉네임
          </label>
          <input type="text" required className="input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            비밀번호
          </label>
          <input type="password" required className="input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            비밀번호 확인
          </label>
          <input type="password" required className="input-style" />
        </div>
        <button type="submit" className="button-primary mt-2">
          가입하기
        </button>
      </form>
    </Modal>
  );
}

export default SignUpModal;