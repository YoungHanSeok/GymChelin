import Header from '@/components/layout/Header';
import React from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="">
        
        {/* 좌측 광고 영역 (시맨틱 태그: <aside>) */}
        <aside className="hidden lg:block py-8">
          <div className="sticky top-20 ...">
            좌측 광고
          </div>
        </aside>

        {/* 중앙 컨텐츠 영역 (시맨틱 태그: <section> 또는 <div>)
          이 children이 page.tsx 파일입니다. 
        */}
        <section className="w-full py-8">
          {children} 
        </section>

        {/* 우측 광고 영역 (시맨틱 태그: <aside>) */}
        <aside className="hidden lg:block py-8">
          <div className="sticky top-20 ...">
            우측 광고
          </div>
        </aside>

      </main>
    </div>
  );
}