import { useEffect, useRef, useState } from 'react';

const LazyVideo = ({ src, type = "video/webm", ...props }) => {
  const ref = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect(); // Unobserve once loaded
      }
    }, { threshold: 0.25 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible && (
        <video
          src={src}
          type={type}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyVideo;
