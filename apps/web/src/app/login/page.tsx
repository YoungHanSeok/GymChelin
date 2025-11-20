'use client';

import React, { useState } from "react";
import SignUpModal from "./SignUpComponent";
import FindIdModal from "./FindIdComponent";
import FindPasswordModal from "./FindPasswordComponent";
import Link from "next/link";


const LoginPage = () => {
  type ModalType = 'signup' | 'findId' | 'findPassword' | null;

  // 현재 열려있는 모달의 상태
  const [modalOpen, setModalOpen] = useState<ModalType>(null);

  // 모달 닫기 핸들러
  const handleCloseModal = () => setModalOpen(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow-lg">
        {/* 1. 로고 또는 앱 이름 */}
        <Link href="/" className="block w-full">
            <h1 className="text-center text-3xl font-bold text-blue-600">
            Gymchelin
            </h1>
        </Link>
        {/* 2. 기본 로그인 폼 */}
        <form className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              이메일
            </label>
            <input id="email" type="email" required className="input-style" />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              className="input-style"
            />
          </div>
          <button type="submit" className="button-primary">
            로그인
          </button>
        </form>

        {/* 3. OAuth 버튼 영역 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">간편 로그인</span>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          {/* TODO: 실제 OAuth 버튼 (카카오, 네이버, 구글 등)으로 교체 */}
          <button className="flex w-full items-center justify-center rounded-md bg-yellow-400 py-2 font-medium text-gray-800 hover:bg-yellow-500">
            {/* SVG 아이콘 추가 권장 */}
            카카오 로그인
          </button>
          <button className="flex w-full items-center justify-center rounded-md bg-white py-2 font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            {/* SVG 아이콘 추가 권장 */}
            Google 로그인
          </button>
        </div>

        {/* 4. 모달 트리거 버튼 (회원가입, 아이디/비밀번호 찾기) */}
        <div className="flex justify-around text-sm">
          <button
            type="button"
            onClick={() => setModalOpen('signup')}
            className="font-medium text-blue-600 hover:underline"
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={() => setModalOpen('findId')}
            className="font-medium text-blue-600 hover:underline"
          >
            아이디 찾기
          </button>
          <button
            type="button"
            onClick={() => setModalOpen('findPassword')}
            className="font-medium text-blue-600 hover:underline"
          >
            비밀번호 찾기
          </button>
        </div>
      </div>

      {/* 5. 모달 조건부 렌더링 */}
      {modalOpen === 'signup' && <SignUpModal onClose={handleCloseModal} />}
      {modalOpen === 'findId' && <FindIdModal onClose={handleCloseModal} />}
      {modalOpen === 'findPassword' && (
        <FindPasswordModal onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default LoginPage;