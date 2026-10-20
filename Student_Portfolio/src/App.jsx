import { useState, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Login from "./pages/Login";
import UsersManagement from "./pages/UsersManagement";
import RoleGuard from "./components/RoleGuard";
import NotFound from "./components/NotFound";
import Spinner from "./components/Spinner";

const Projects = lazy(() => import("./pages/Projects"));
const Contact = lazy(() => import("./pages/Contact"));

import "./App.css";

function App() {

  const [theme, setTheme] = useState("light");
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className={`app-wrapper ${theme}-theme`} id="app-root-wrapper">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main className="main-content" id="main-content-area">
        <Suspense
          fallback={
            <div role="status" aria-live="polite">
              <Spinner text="Loading page..." />
            </div>
          }
        >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["admin", "manager"]}>
                  <UsersManagement />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
