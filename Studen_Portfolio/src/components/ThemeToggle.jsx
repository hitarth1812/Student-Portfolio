
// ThemeToggle component receives current theme and toggle function as props
function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button 
      id="theme-toggle-btn"
      className="theme-toggle-btn" 
      onClick={toggleTheme}
      aria-label="Toggle Theme"
    >
      {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );
}

export default ThemeToggle;
