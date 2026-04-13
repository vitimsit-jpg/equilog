"use client";

import dynamic from "next/dynamic";

const TodayBlock = dynamic(() => import("./TodayBlock"), {
  ssr: false,
  loading: () => null,
});

export default TodayBlock;
