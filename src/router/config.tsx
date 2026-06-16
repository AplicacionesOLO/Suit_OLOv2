import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import LoginPage from "../pages/login/page";
import ForgotPasswordPage from "../pages/forgot-password/page";
import AuthCallbackPage from "../pages/auth-callback/page";
import DashboardPage from "../pages/dashboard/page";
import CategoriesPage from "../pages/categories/page";
import ApplicationsPage from "../pages/applications/page";
import InstancesPage from "../pages/instances/page";
import CatalogPage from "../pages/catalog/page";
import AssignmentsPage from "../pages/assignments/page";
import IntegrationPage from "../pages/integration/page";
import RolesPage from "../pages/roles/page";
import AppAccessPage from "../pages/app-access/page";
import MyAccessPage from "../pages/my-access/page";
import AuditPage from "../pages/audit/page";
import SecuritySettingsPage from "../pages/security-settings/page";
import ProfilePageComponent from "../pages/profile/page";
import SessionsPage from "../pages/sessions/page";
import SecurityAlertsPage from "../pages/security-alerts/page";
import CountriesPage from "../pages/countries/page";
import WarehousesPage from "../pages/warehouses/page";
import ClientsPage from "../pages/clients/page";
import UsersPage from "../pages/users/page";
import TenantsPage from "../pages/tenants/page";
import TenantDetailPage from "../pages/tenants/detail";
import RlsTestPage from "../pages/rls-test/page";
import { ModulesPage } from "../pages/placeholders/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/categories",
    element: <CategoriesPage />,
  },
  {
    path: "/applications",
    element: <ApplicationsPage />,
  },
  {
    path: "/instances",
    element: <InstancesPage />,
  },
  {
    path: "/catalog",
    element: <CatalogPage />,
  },
  {
    path: "/assignments",
    element: <AssignmentsPage />,
  },
  {
    path: "/integration",
    element: <IntegrationPage />,
  },
  {
    path: "/roles",
    element: <RolesPage />,
  },
  {
    path: "/app-access",
    element: <AppAccessPage />,
  },
  {
    path: "/my-access",
    element: <MyAccessPage />,
  },
  {
    path: "/audit",
    element: <AuditPage />,
  },
  {
    path: "/security-settings",
    element: <SecuritySettingsPage />,
  },
  {
    path: "/profile",
    element: <ProfilePageComponent />,
  },
  {
    path: "/sessions",
    element: <SessionsPage />,
  },
  {
    path: "/security-alerts",
    element: <SecurityAlertsPage />,
  },
  {
    path: "/countries",
    element: <CountriesPage />,
  },
  {
    path: "/warehouses",
    element: <WarehousesPage />,
  },
  {
    path: "/clients",
    element: <ClientsPage />,
  },
  {
    path: "/users",
    element: <UsersPage />,
  },
  {
    path: "/tenants",
    element: <TenantsPage />,
  },
  {
    path: "/tenants/:id",
    element: <TenantDetailPage />,
  },
  {
    path: "/rls-test",
    element: <RlsTestPage />,
  },
  {
    path: "/modules",
    element: <ModulesPage />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;