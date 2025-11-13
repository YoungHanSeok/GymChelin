'use client'; // 클라이언트 컴포넌트로 선언

import React, { useState } from 'react';

const Header = () => {
  // 모바일 메뉴의 열림/닫힘 상태를 관리
  const [isOpen, setIsOpen] = useState(false);

  return (
    // 상단 네비게이션 바
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* 로고 */}
          <div>
            <a href="#" className="text-2xl font-bold text-gray-900">
              Gymchelin
            </a>
          </div>

          {/* 데스크톱 메뉴 (md 화면 이상에서 보임) */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-gray-700 hover:text-blue-600">
              Home
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600">
              About
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600">
              Services
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600">
              Contact
            </a>
          </div>

          {/* 오른쪽 영역 */}
          <div className="flex items-center">
            {/* 로그인 버튼 (데스크톱) */}
            <div className="hidden md:block">
              <a href="#" className="text-gray-700 hover:text-blue-600">
                Login
              </a>
            </div>

            {/* 모바일 메뉴 버튼 (md 화면 미만에서 보임) */}
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-700 focus:outline-none"
                aria-label="Toggle menu"
              >
                {/* 상태(isOpen)에 따라 아이콘 변경 */}
                {isOpen ? (
                  // 닫기 (X) 아이콘
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  // 햄버거 아이콘
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 (isOpen 상태에 따라 표시/숨김) */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <a
          href="#"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Home
        </a>
        <a
          href="#"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          About
        </a>
        <a
          href="#"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Services
        </a>
        <a
          href="#"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Contact
        </a>
        <div className="my-1 border-t border-gray-200" />
        <a
          href="#"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Login
        </a>
      </div>
    </nav>
  );
};

export default Header;