import Modal from "../_components/modalComponent";

const FindIdComponent = ({ onClose }: { onClose: () => void }) => {
    return (
    <Modal onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-semibold">아이디 찾기</h2>
      <form className="space-y-4">
        <p className="text-center text-sm text-gray-600">
          가입 시 사용한 닉네임을 입력하세요.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            닉네임
          </label>
          <input type="text" required className="input-style" />
        </div>
        <button type="submit" className="button-primary mt-2">
          아이디 찾기
        </button>
      </form>
    </Modal>
  );
}

export default FindIdComponent;