"use client";
import api from '@/lib/api';
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
  const testFunction = () => {
    let data = {
      sampleKey: 'sampleValue',
      sampleValue: 12345
    }

    api.post('test',data)
      .then(response => {
        console.log('Response from /api/test:', response.data);
      })
      .catch(error => {
        console.error('Error fetching /api/test:', error);
      });
  }
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">주변 헬스장 목록</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        <button className='whitespace-nowrap rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700'
        onClick={testFunction}>
          테스트</button>
      </div>
    </div>
  );
};

export default GymsPage;