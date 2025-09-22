// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";
import { MaterialUIControllerProvider } from "context";
// import { AuthProvider } from "./auth/AuthProvider";
import AuthProvider from "./auth/AuthProvider";

const el = document.getElementById("root") || document.getElementById("app");
if (!el) {
  throw new Error('Root container not found. Add <div id="root"></div> to public/index.html');
}
const root = createRoot(el);

root.render(
  <BrowserRouter>
    <MaterialUIControllerProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MaterialUIControllerProvider>
  </BrowserRouter>
);


