'use client'

import { Hero } from "@/components/hero";
import { Leva } from "leva";

export default function Home() {
  return (
    <>
      <Hero />
      <Leva hidden />
    </>
  );
}
