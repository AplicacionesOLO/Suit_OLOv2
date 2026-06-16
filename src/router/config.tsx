import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import AccessDeniedPage from "../pages/AccessDenied";
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
import RouteGuard from "../components/feature/RouteGuard";
import WorkspacePage from "../pages/workspace/page";

function Guarded({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}

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
    path: "/access-denied",
    element: <AccessDeniedPage />,
  },
  {
    path: "/dashboard",
    element: <Guarded><DashboardPage /></Guarded>,
  },
  {
    path: "/categories",
    element: <Guarded><CategoriesPage /></Guarded>,
  },
  {
    path: "/applications",
    element: <Guarded><ApplicationsPage /></Guarded>,
  },
  {
    path: "/instances",
    element: <Guarded><InstancesPage /></Guarded>,
  },
  {
    path: "/catalog",
    element: <Guarded><CatalogPage /></Guarded>,
  },
  {
    path: "/assignments",
    element: <Guarded><AssignmentsPage /></Guarded>,
  },
  {
    path: "/integration",
    element: <Guarded><IntegrationPage /></Guarded>,
  },
  {
    path: "/roles",
    element: <Guarded><RolesPage /></Guarded>,
  },
  {
    path: "/app-access",
    element: <Guarded><AppAccessPage /></Guarded>,
  },
  {
    path: "/my-access",
    element: <Guarded><MyAccessPage /></Guarded>,
  },
  {
    path: "/workspace/:instanceId",
    element: <Guarded><WorkspacePage /></Guarded>,
  },
  {
    path: "/audit",
    element: <Guarded><AuditPage /></Guarded>,
  },
  {
    path: "/security-settings",
    element: <Guarded><SecuritySettingsPage /></Guarded>,
  },
  {
    path: "/profile",
    element: <Guarded><ProfilePageComponent /></Guarded>,
  },
  {
    path: "/sessions",
    element: <Guarded><SessionsPage /></Guarded>,
  },
  {
    path: "/security-alerts",
    element: <Guarded><SecurityAlertsPage /></Guarded>,
  },
  {
    path: "/countries",
    element: <Guarded><CountriesPage /></Guarded>,
  },
  {
    path: "/warehouses",
    element: <Guarded><WarehousesPage /></Guarded>,
  },
  {
    path: "/clients",
    element: <Guarded><ClientsPage /></Guarded>,
  },
  {
    path: "/users",
    element: <Guarded><UsersPage /></Guarded>,
  },
  {
    path: "/tenants",
    element: <Guarded><TenantsPage /></Guarded>,
  },
  {
    path: "/tenants/:id",
    element: <Guarded><TenantDetailPage /></Guarded>,
  },
  {
    path: "/rls-test",
    element: <Guarded><RlsTestPage /></Guarded>,
  },
  {
    path: "/modules",
    element: <Guarded><ModulesPage /></Guarded>,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;