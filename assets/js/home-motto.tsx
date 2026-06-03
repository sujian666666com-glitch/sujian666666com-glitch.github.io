import React from "react";
import { createRoot } from "react-dom/client";
import { HomeMottoRandom } from "./components/HomeMottoRandom";

const rootElement = document.querySelector("[data-home-motto-root]");

if (rootElement) {
  createRoot(rootElement).render(<HomeMottoRandom />);
}
