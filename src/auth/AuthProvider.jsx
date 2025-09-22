// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, logout as apiLogout, me } from "../api/auth";
import { setToken, setTenantSlug, getTenantSlug } from "../api/client";
import { myTenants } from "../api/tenants";
import api from "../api/client";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [tenantSlug, _setTenantSlug] = useState(getTenantSlug());

  // Call /auth/me ONLY if we have token AND tenant (non-superadmin needs tenant).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    if (!tenantSlug) { setLoading(false); return; }

    (async () => {
      try {
        setLoading(true);
        const info = await me();
        setUser(info.user || null);
        setRoles(info.roles || []);
        setPerms(info.permissions || []);
      } catch {
        // Don't nuke identity here; just clear RBAC.
        setRoles([]); setPerms([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantSlug]);

  const hydrate = async () => {
    try {
      setLoading(true);
      const info = await me();
      setUser(info.user || null);
      setRoles(info.roles || []);
      setPerms(info.permissions || []);
    } catch {
      setRoles([]); setPerms([]);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = async (slug) => {
    setTenantSlug(slug);          // persist + sanitize (client.js)
    _setTenantSlug(slug || null); // trigger effect
    await hydrate();
    if (user) navigate("/dashboard", { replace: true });
  };

  const clearTenant = () => {
    setTenantSlug(null);
    _setTenantSlug(null);
    setRoles([]); setPerms([]);
  };

  // const login = async (email, password) => {
  //   const data = await apiLogin(email, password); // sets token in api/auth.js

  //   // Use the payload immediately so Protected routes don't block
  //   setUser(data.user || null);
  //   setRoles(data.roles || []);
  //   setPerms(data.permissions || []);

  //   // SUPERADMIN → DO NOT call /auth/me (tenant optional / not required)
  //   if (data.user?.is_superadmin) {
  //     navigate("/dashboard", { replace: true });
  //     return;
  //   }

  //   // Non-superadmin: need a tenant set to hydrate RBAC
  //   const haveTenant = !!getTenantSlug();
  //   if (haveTenant) {
  //     await hydrate();
  //     navigate("/dashboard", { replace: true });
  //   } else {
  //     // No tenant yet → (optionally) navigate to tenant selection
  //     // navigate("/tenant/select", { replace: true });
  //   }
  // };

  const login = async (email, password) => {
  const data = await apiLogin(email, password); // sets token

  setUser(data.user || null);
  setRoles(data.roles || []);
  setPerms(data.permissions || []);

  if (data.user?.is_superadmin) {
    navigate("/dashboard", { replace: true });
    return;
  }

  try {
    const list = await myTenants();             // token-only, no tenant needed
    if (Array.isArray(list) && list.length === 1) {
      await switchTenant(list[0].slug);         // sets X-Tenant + /auth/me + go to /dashboard
      return;
    }
  } catch { /* ignore and fall through */ }

  // No tenant yet → go create it
  navigate("/tenant/create", { replace: true });
};

const logout = async () => {
  try {
    await apiLogout(); // may 401 if token already revoked — that's fine
  } catch (e) {
    // Ignore unauthorized/expired token errors on logout
    // Optionally inspect: if (e?.response?.status !== 401 && e?.response?.status !== 419) console.warn(e);
  } finally {
    setToken(null);      // remove token from localStorage + axios
    clearTenant();       // remove tenant + clear RBAC
    setUser(null);       // IMPORTANT: drop in-memory user so <Protected> redirects
    setRoles([]);
    setPerms([]);
    navigate("/authentication/sign-in", { replace: true });
  }
};

  const hasPerm = (key) => {
    if (!key) return true;
    if (perms.includes(key)) return true;
    const group = key.split(".")[0] + ".*";
    return perms.includes(group);
  };

  const value = useMemo(() => ({
    loading, user, roles, perms, hasPerm,
    tenantSlug, switchTenant, clearTenant,
    login, logout,
  }), [loading, user, roles, perms, tenantSlug]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
