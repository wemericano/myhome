'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Food {
  id: number;
  kind: string | null;
  name: string;
  location: string | null;
  distance: number | null;
  time: number | null;
  price: string | null;
  feet: number | null;
  star: string | null;
}

export default function Home() {
  const [showFoodList, setShowFoodList] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLunch = async () => {
    setShowFoodList(true);
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/food');
      const result = await response.json();
      if (result.success) {
        setFoods(result.data);
      } else {
        setError(result.error || '데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0f172a', color: '#e5e7eb' }}
    >
      <div className="text-center">
        <h1 className="text-[42px] mb-3">🚀 Hello My World 🚀</h1>
        <p className="opacity-80 text-base">- WeVeloper -</p>
        <div className="flex gap-5 mt-10 justify-center flex-wrap">
          <Link
            href="/portfolio.html"
            className="inline-block px-8 py-3.5 text-base font-semibold rounded-xl border-0 cursor-pointer transition-all duration-300 no-underline text-white hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            }}
          >
            포트폴리오
          </Link>
          <Link
            href="/stock_ai"
            className="inline-block px-8 py-3.5 text-base font-semibold rounded-xl border-0 cursor-pointer transition-all duration-300 no-underline text-white hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            }}
          >
            AI Stock Predictor
          </Link>
          <button
            onClick={handleLunch}
            className="inline-block px-8 py-3.5 text-base font-semibold rounded-xl border-0 cursor-pointer transition-all duration-300 text-white hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
              boxShadow: '0 10px 30px rgba(236, 72, 153, 0.3)',
            }}
          >
            🍽️ 런치
          </button>
        </div>
      </div>

      {showFoodList && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowFoodList(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#e5e7eb', borderColor: '#374151', border: '1px solid' }}
          >
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', borderColor: '#374151' }}
            >
              <h2 className="text-2xl font-bold">🍽️ 식당 리스트</h2>
              <button
                onClick={() => setShowFoodList(false)}
                className="text-white hover:bg-pink-700 rounded-lg p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loading && (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#ec4899' }}></div>
                </div>
              )}

              {error && (
                <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-4 text-red-300">
                  {error}
                </div>
              )}

              {!loading && !error && foods.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">식당 데이터가 없습니다.</p>
                </div>
              )}

              {!loading && !error && foods.length > 0 && (
                <div className="grid gap-4">
                  {foods.map((food) => (
                    <div
                      key={food.id}
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors border"
                      style={{ borderColor: '#4b5563' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white">{food.name}</h3>
                          {food.kind && (
                            <span
                              className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}
                            >
                              {food.kind}
                            </span>
                          )}
                        </div>
                        {food.star && (
                          <div className="text-2xl font-bold text-yellow-400">{food.star} ⭐</div>
                        )}
                      </div>

                      <div className="text-sm text-gray-300 space-y-1">
                        {food.location && (
                          <p>📍 {food.location}</p>
                        )}
                        <div className="flex gap-4 flex-wrap">
                          {food.distance && (
                            <span>🚶 거리: {food.distance}m</span>
                          )}
                          {food.feet && (
                            <span>🚶 거리: {food.feet}ft</span>
                          )}
                          {food.time && (
                            <span>⏱️ 시간: {food.time}분</span>
                          )}
                        </div>
                        {food.price && (
                          <p className="text-green-400 font-semibold">💰 {food.price}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t" style={{ background: '#111827', borderColor: '#374151' }}>
              <button
                onClick={() => setShowFoodList(false)}
                className="w-full px-4 py-2 rounded-lg font-semibold transition-all text-white hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
