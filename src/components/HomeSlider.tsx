// src/components/HomeSlider.tsx
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const HomeSlider = () => {
  return (
    <Swiper
      spaceBetween={50}
      slidesPerView={1}
      autoplay={{ delay: 3000 }}
      loop={true}
    >
      <SwiperSlide>
        <img src="/images/Acceuil.png" alt="Slide 1" />
      </SwiperSlide>
      <SwiperSlide>
        <img src="/images/slide2.jpg" alt="Slide 2" />
      </SwiperSlide>
      <SwiperSlide>
        <img src="/images/slide3.jpg" alt="Slide 3" />
      </SwiperSlide>
    </Swiper>
  );
};

export default HomeSlider;
