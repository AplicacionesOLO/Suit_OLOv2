import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { TenantContextProvider } from "./hooks/useTenantContext";
import AuthGuard from "./components/feature/AuthGuard";
import i18n from "./i18n";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <ThemeProvider>
            <TenantContextProvider>
              <AuthGuard>
                <AppRoutes />
              </AuthGuard>
            </TenantContextProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;