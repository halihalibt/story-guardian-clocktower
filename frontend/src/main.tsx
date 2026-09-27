import React from "react";
import { createRoot } from "react-dom/client";
import Guardian from "./Guardian";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(<React.StrictMode><Guardian/></React.StrictMode>);
