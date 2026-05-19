import React from "react";

const getLastBusinessDayOfMonth = (): string => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }

  const day = lastDay.getDate();
  const month = lastDay.getMonth() + 1;

  return `${day}/${month}`;
};

const getBannerMessage = (updateDate: string): string => {
  return `próxima atualização ${updateDate}`;
};

const UpdateBanner: React.FC = () => {
  const updateDate = getLastBusinessDayOfMonth();
  const bannerMessage = getBannerMessage(updateDate);

  return (
    <>
      <div className="h-10 md:h-12" aria-hidden="true" />

      <div className="fixed top-0 left-0 w-full z-50 bg-[var(--color-gray)] py-2 md:py-3 overflow-hidden">
        <div className="banner-marquee" aria-label={bannerMessage}>
          <div className="banner-marquee-track">
            <div className="banner-marquee-group">
              <span className="banner-marquee-text text-black text-base md:text-lg font-light lowercase whitespace-nowrap">
                {bannerMessage}
              </span>
            </div>
            <div className="banner-marquee-group" aria-hidden="true">
              <span className="banner-marquee-text text-black text-base md:text-lg font-light lowercase whitespace-nowrap">
                {bannerMessage}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateBanner;
