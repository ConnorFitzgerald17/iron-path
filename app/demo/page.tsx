import type { Metadata } from "next";
import { IronPathApp } from "@/components/iron-path-app";

export const metadata: Metadata = {
  title: "Demo journal — Iron Path",
  description: "Explore an interactive Iron Path journal with demo Old School RuneScape account data.",
};

export default function DemoPage() {
  return <IronPathApp mode="demo" />;
}
