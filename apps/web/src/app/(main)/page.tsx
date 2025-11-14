import React from 'react';

// 예시 데이터: 헬스장 정보
const gyms = [
  {
    id: 1,
    name: '강남 피트니스 센터',
    location: '강남역 5분 거리',
    rating: 4.8,
    reviews: 120,
    imageUrl: 'https://via.placeholder.com/400x250/203040/FFFFFF?text=GYM+1',
  },
  {
    id: 2,
    name: '신사 프리미엄 짐',
    location: '신사동 가로수길',
    rating: 4.5,
    reviews: 85,
    imageUrl: 'https://via.placeholder.com/400x250/34495e/FFFFFF?text=GYM+2',
  },
  {
    id: 3,
    name: '역삼 크로스핏 박스',
    location: '역삼역 도보 10분',
    rating: 4.9,
    reviews: 210,
    imageUrl: 'https://via.placeholder.com/400x250/1abc9c/FFFFFF?text=GYM+3',
  },
  {
    id: 4,
    name: '선릉 웨이트 클럽',
    location: '선릉역 2번 출구',
    rating: 4.7,
    reviews: 95,
    imageUrl: 'https://via.placeholder.com/400x250/8e44ad/FFFFFF?text=GYM+4',
  },
];

const GymsPage = () => {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">주변 헬스장 목록</h1>
      
      {/* 카드 그리드
        - grid grid-cols-1: 기본적으로 1단
        - sm:grid-cols-2: sm(640px) 이상에서 2단
        - lg:grid-cols-2: lg(1024px) 이상에서 2단 (만약 3단으로 하고 싶다면 lg:grid-cols-3으로 변경)
        - xl:grid-cols-2: xl(1280px) 이상에서 2단 (중앙 컨텐츠 영역이 1280px이므로, 2단이 적절합니다.)
        - gap-6: 카드 사이 간격
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {gyms.map((gym) => (
          // 개별 카드
          <div key={gym.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
            {/* 카드 이미지 */}
            <img src={gym.imageUrl} alt={gym.name} className="w-full h-48 object-cover" />
            
            <div className="p-5">
              {/* 헬스장 이름 */}
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{gym.name}</h2>
              
              {/* 위치 */}
              <p className="text-gray-600 text-sm mb-3">{gym.location}</p>
              
              {/* 평점 및 리뷰 */}
              <div className="flex items-center text-sm text-gray-700">
                <span className="flex items-center mr-3">
                  <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                  </svg>
                  {gym.rating}
                </span>
                <span>리뷰 {gym.reviews}개</span>
              </div>
              
              {/* 상세 보기 버튼 */}
              <div className="mt-5">
                <a href={`/gyms/${gym.id}`} className="inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300">
                  자세히 보기
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GymsPage;