"use client";

import dynamic from "next/dynamic";

const DashboardPlanningCards = dynamic(() => import("./DashboardPlanningCards"), {
  ssr: false,
  loading: () => null,
});

export default DashboardPlanningCards;
