import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

// Renders `ui` at `path` inside the same providers the real app uses.
// `extraRoutes` lets a test assert on navigation, e.g. { '/dashboard': <p>Dash</p> }.
export function renderWithProviders(ui, { path = '/', extraRoutes = {} } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path={path} element={ui} />
              {Object.entries(extraRoutes).map(([p, el]) => (
                <Route key={p} path={p} element={el} />
              ))}
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}
