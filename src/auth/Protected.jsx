import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function Protected({ children, need, requireTenant = false }) {
  const { loading, user, hasPerm, tenantSlug } = useAuth();

  if (loading) return null;

  // must be logged in
  if (!user) return <Navigate to="/authentication/sign-in" replace />;

  // if this route needs tenant context, block non-superadmin without tenant
  if (requireTenant && !user.is_superadmin && !tenantSlug) {
    return <Navigate to="/tenant/create" replace />;
  }

  // permission gating (optional)
  if (need && !hasPerm(need)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
