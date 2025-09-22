// src/auth/AuthOnly.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function AuthOnly({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/authentication/sign-in" replace />;
}
