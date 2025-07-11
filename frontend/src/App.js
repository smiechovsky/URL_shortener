import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ShortenForm from "./components/ShortenForm";
import RedirectScreen from "./components/RedirectScreen";
import Stats from "./components/Stats";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShortenForm />} />
        <Route path="/r/:short" element={<RedirectScreen />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  );
}