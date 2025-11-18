import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

const Modal = ({onClose,children} : ModalProps) => {
    return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* 2. 모달 컨텐츠 */}
      <div
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫기 방지
      >
        {/* 3. 닫기 버튼 (X) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-2xl text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>

        {/* 4. 모달 제목 */}


        {/* 5. 모달 바디 (폼 내용) */}
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;

