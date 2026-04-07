"use client";

import dynamic from "next/dynamic";

const HorsePlanningCards = dynamic(() => import("./HorsePlanningCards"), {
  ssr: false,
  loading: () => (
    <div className="card animate-pulse">
      <div className="h-20 bg-gray-100 rounded-xl" />
    </div>
  ),
});

export default HorsePlanningCards;
