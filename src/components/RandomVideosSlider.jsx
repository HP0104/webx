import React, { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import VideoCardItem from './VideoCardItem';

export default function RandomVideosSlider() {
  const { videos = [] } = useAppContext();
  const [randomVideos, setRandomVideos] = useState([]);
  const sliderRef = useRef(null);

  useEffect(() => {
    if (videos.length > 0) {
      const shuffled = [...videos].sort(() => 0.5 - Math.random());
      setRandomVideos(shuffled.slice(0, 6));
    }
  }, [videos]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const onWheel = (e) => {
      if (e.deltaY === 0) return;
      const isScrollable = slider.scrollWidth > slider.clientWidth;
      if (!isScrollable) return;
      
      const atLeftEnd = slider.scrollLeft <= 0 && e.deltaY < 0;
      const atRightEnd = Math.ceil(slider.scrollLeft + slider.clientWidth) >= slider.scrollWidth && e.deltaY > 0;
      
      if (!atLeftEnd && !atRightEnd) {
        e.preventDefault();
        const cardWidth = slider.querySelector('.video-card')?.clientWidth || 300;
        const scrollAmount = e.deltaY > 0 ? cardWidth + 24 : -(cardWidth + 24);
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    slider.addEventListener('wheel', onWheel, { passive: false });
    return () => slider.removeEventListener('wheel', onWheel);
  }, [randomVideos]);

  if (randomVideos.length === 0) return null;

  return (
    <div className="random-videos-section" style={{ marginBottom: '3rem' }}>
      <div className="videos-header-content" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <Film size={28} className="videos-header-icon" color="var(--color-accent)" />
        <div>
          <h2 className="videos-title" style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-text-light)' }}>Phim Ngẫu Nhiên</h2>
        </div>
        <div className="section-line" style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
        <Link to="/videos/all" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.9rem', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.target.style.opacity = '0.8'} onMouseLeave={(e) => e.target.style.opacity = '1'}>Xem thêm &raquo;</Link>
      </div>
      <div 
        className="random-videos-slider" 
        ref={sliderRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '1.5rem',
          paddingBottom: '1.5rem',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>
          {`
            .random-videos-slider::-webkit-scrollbar {
              height: 8px;
            }
            .random-videos-slider::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 4px;
            }
            .random-videos-slider::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
              border-radius: 4px;
            }
            .random-videos-slider::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
            .random-videos-slider .video-card {
              width: calc(28.57% - 1.07rem); /* Show 3.5 cards */
              flex: 0 0 calc(28.57% - 1.07rem);
              scroll-snap-align: start;
            }
            @media (max-width: 1200px) {
              .random-videos-slider .video-card {
                width: calc(25% - 1.125rem); /* Show 4 cards */
                flex: 0 0 calc(25% - 1.125rem);
              }
            }
            @media (max-width: 1024px) {
              .random-videos-slider .video-card {
                width: calc(33.333% - 1rem); /* Show 3 cards */
                flex: 0 0 calc(33.333% - 1rem);
              }
            }
            @media (max-width: 640px) {
              .random-videos-slider .video-card {
                width: calc(60% - 1rem); /* Show 1.5 cards on mobile */
                flex: 0 0 calc(60% - 1rem);
              }
            }
          `}
        </style>
        {randomVideos.map(video => (
          <VideoCardItem key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
