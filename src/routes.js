
import Dashboard from "layouts/dashboard";
import Tables from "layouts/tables";
import Billing from "layouts/billing";
// import RTL from "layouts/rtl";
import Notifications from "layouts/notifications";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import Logout from "layouts/authentication/logout"; // <-- add this import
import SignUp from "layouts/authentication/sign-up";
import Protected from "./auth/Protected";
import ResetPassword from "layouts/authentication/reset-password/cover";
import CreateTenant from "layouts/tenant/create";
import HomePublic from "layouts/public/home";
import SetNewPassword from "layouts/authentication/reset-password/set";
import ProductsPage from "layouts/products";


import AuthOnly from "auth/AuthOnly";
import TenantThankYou from "layouts/tenant/thank-you";

import GenerateQrPage from "layouts/qr";
import UsersPage from "layouts/users";

// import Dashboard from "layouts/dashboard";
// import Protected from "auth/Protected";

// import Tables from "layouts/tables";
// import Billing from "layouts/billing";

// @mui icons
import Icon from "@mui/material/Icon";

const routes = [
  {
  type: "route",
  name: "Home",
  key: "home",
  route: "/",
  component: <HomePublic />,
},
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    // component: <Dashboard />,
     component: (
      <Protected requireTenant /* need="dashboard.read" <- add if you use perms */>
        <Dashboard />
      </Protected>
    ),
  },
  {
  type: "collapse",
  name: "Users",
  key: "users",
  icon: <Icon>group</Icon>,
  route: "/users",
  component: (
    <Protected need="user.read">
      <UsersPage />
    </Protected>
  ),
  authOnly: true,
},

{
  type: "collapse",
  name: "Products",
  key: "products",
  icon: <Icon>inventory_2</Icon>,
  route: "/products",
  component: (
    <Protected need="product.read">
      <ProductsPage />
    </Protected>
  ),
  authOnly: true,
},
{
  type: "collapse",
  name: "Generate QR",
  key: "generate-qr",
  icon: <Icon>qr_code_2</Icon>,
  route: "/qr",
  component: (
    <Protected need="product.write">
      <GenerateQrPage />
    </Protected>
  ),
  authOnly: true,
},
  // {
  //   type: "collapse",
  //   name: "Tables",
  //   key: "tables",
  //   icon: <Icon fontSize="small">table_view</Icon>,
  //   route: "/tables",
  //   component: <Tables />,
  //   // component: (
  //   //   <Protected need="product.read">
  //   //     <Tables />
  //   //   </Protected>
  //   // ),
  // },
  {
    type: "collapse",
    name: "Billing",
    key: "billing",
    icon: <Icon fontSize="small">receipt_long</Icon>,
    route: "/billing",
    component: <Billing />,
    // component: (
    //   <Protected need="user.read">
    //     <Billing />
    //   </Protected>
    // ),
  },
  // {
  //   type: "collapse",
  //   name: "RTL",
  //   key: "rtl",
  //   icon: <Icon fontSize="small">format_textdirection_r_to_l</Icon>,
  //   route: "/rtl",
  //   component: <RTL />,
  // },
  {
    type: "collapse",
    name: "Notifications",
    key: "notifications",
    icon: <Icon fontSize="small">notifications</Icon>,
    route: "/notifications",
    component: <Notifications />,
  },
  {
    type: "collapse",
    name: "Profile",
    key: "profile",
    icon: <Icon fontSize="small">person</Icon>,
    route: "/profile",
    component: <Profile />,
  },
  {
    type: "route",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
    guestOnly: true,
    hideInSidenav: true,
    
  },
  {
    type: "route",
    name: "Sign Up",
    key: "sign-up",
    icon: <Icon fontSize="small">assignment</Icon>,
    route: "/authentication/sign-up",
    component: <SignUp />,
    guestOnly: true,
    hideInSidenav: true,
  },

  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/logout",
    component: <Logout />,
    authOnly: true,
  },

  {
  type: "route",
  name: "Reset Password",
  key: "reset-password",
  icon: <Icon>lock_reset</Icon>,  // optional
  route: "/authentication/reset-password",
  component: <ResetPassword />,
  noCollapse: true,
  // If you don't want it in the sidebar menu, omit it from the menu render or
  // keep it in a separate routes list used only by <Routes>.
},

{
  type: "route",
  name: "Set Password",
  key: "set-password",
  route: "/authentication/set-password",
  component: <SetNewPassword />,
  noCollapse: true,
},
{
  type: "route",
  name: "Create Tenant",
  key: "create-tenant",
  route: "/tenant/create",
  component: (
    <Protected>
      <CreateTenant />
    </Protected>
  ),
},
{
  type: "route",
  name: "Create Tenant",
  key: "tenant-create",
  route: "/tenant/create",
  component: (
    <AuthOnly>
      <CreateTenant />
    </AuthOnly>
  ),
  noCollapse: true,
},
{
  type: "route",
  name: "Tenant Thank You",
  key: "tenant-thank-you",
  route: "/tenant/thank-you",
  component: (
    <AuthOnly>
      <TenantThankYou />
    </AuthOnly>
  ),
  noCollapse: true,
},

];

export default routes;
