'use client'; // 클라이언트 컴포넌트로 선언

export default function Home() {
  const handleFetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/users');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const users = await response.json();
      console.log('Fetched Users:', users); // 성공 시 콘솔에 유저 데이터 출력
    } catch (error) {
      console.error('Failed to fetch users:', error); // 실패 시 에러 출력
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">GymChelin</h1>
      </div>
      <button
        onClick={handleFetchUsers}
        className="mt-8 rounded-lg bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
      >
        유저 정보 불러오기 버튼 테스트
      </button>
    </main>
  );
}