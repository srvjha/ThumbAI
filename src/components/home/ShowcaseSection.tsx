import React from "react";
import { InfiniteMovingCards } from "../ui/infinite-moving-cards";

export const ShowcaseSection = () => {
  return (
    <section className="max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
          Tutorial <span className="text-blue-400">Thumbnails</span>
        </h2>
        <InfiniteMovingCards
          items={["./pgmarry.jpeg", "./hiteshdsa.jpg", "./hiteshdocker.jpg"]}
          direction="right"
          speed="normal"
        />
      </div>

      <div className="mt-28">
        <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
          Gaming/Vlogging <span className="text-blue-400">Thumbnails</span>
        </h2>
        <InfiniteMovingCards
          items={[
            "https://v3.fal.media/files/lion/X6JDNajUhwbqavCtZVYd9.jpeg",
            "https://v3.fal.media/files/zebra/ieZr7-cVRJLoYjqy3A7fR.jpeg",
            "https://v3.fal.media/files/elephant/IpgCSlkEtwpJsp2LrG7qs.jpeg",
            "./mrbeast.jpg",
          ]}
          direction="right"
          speed="normal"
        />
      </div>

      <div className="mt-28">
        <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
          Review <span className="text-blue-400">Thumbnails</span>
        </h2>
        <InfiniteMovingCards
          items={[
            "https://v3.fal.media/files/zebra/iWJh6VpT4bulQnV3ib5FO.jpeg",
            "https://v3.fal.media/files/koala/7tpjveeHxpK8RNreZRplv.jpeg",
          ]}
          direction="right"
          speed="normal"
        />
      </div>
    </section>
  );
};
