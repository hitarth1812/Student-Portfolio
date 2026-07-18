# Practical 2 Reference Guide: State Management & Routing in React

This guide contains detailed explanations of the folder structure, components, React Router mechanisms, state hooks, and viva questions for **Practical 2**.

---

## 1. Installation & Execution Commands

To set up and run this project, run the following commands in the `Studen_Portfolio` root folder:

```bash
# 1. Install dependencies listed in package.json
npm install

# 2. Install React Router DOM (v6 / v7 compatible)
npm install react-router-dom

# 3. Launch the development server
npm run dev
```

---

## 2. File-by-File Explanations

- **`src/main.jsx`**: The entry point of the React application. It boots the React environment, imports global styles (`index.css`), and wraps the root `<App />` component in `<BrowserRouter>` to enable client-side routing.
- **`src/App.jsx`**: The main layout controller. It manages the global `theme` state (`light` or `dark`), applies the theme as a CSS class to the wrapper div, and declares the `<Routes>` structure mapping URLs to page components.
- **`src/App.css`**: The design system. Declares CSS Custom Properties (variables) for dark and light colors, sets up responsive grids for project cards, styling for forms, live preview panels, and theme transitions.
- **`src/index.css`**: Basic reset stylesheet that imports the "Inter" Google Font and resets margin, padding, and default box sizing.
- **`src/components/Navbar.jsx`**: Displays navigation links. It uses React Router's `<Link>` component to update the route without triggering page reloads. Includes the `ThemeToggle` button.
- **`src/components/ThemeToggle.jsx`**: Receives `theme` and the toggle handler from `App.jsx` as props to switch the visual theme dynamically.
- **`src/components/Footer.jsx`**: Renders copyright information and student description at the bottom of the layout.
- **`src/components/NotFound.jsx`**: The custom 404 page displayed for any invalid URLs (`*` route match). Provides a CTA button to navigate back to Home (`/`).
- **`src/pages/Home.jsx`**: Renders student profile details (Hitarth Khatiwala, CHARUSAT/IITM Dual Degree B.Tech AIML / BS Data Science) and lists technical skills.
- **`src/pages/Projects.jsx`**: Renders four responsive project cards generated from sample data.
- **`src/pages/Contact.jsx`**: Implements the controlled contact form using three states, shows real-time typed previews, features a character counter using `message.length`, and toggles help instructions using a state button.

---

## 3. Detailed Technical Concept Explanations

### `BrowserRouter`
`BrowserRouter` is a parent router component provided by `react-router-dom` that uses the HTML5 History API (`pushState`, `replaceState`, and `popstate` events) to sync your UI with the browser's URL. It acts as the state provider for routing context, enabling all child components to access navigation states and route matching.

### `Routes`
`Routes` is a container component introduced in React Router v6. It looks through all of its child `<Route>` elements, finds the best match based on the current URL path, and renders the single matching route element.

### `Route`
`<Route>` is a declaration that links a URL path to a specific React component. It accepts a `path` prop (e.g., `"/projects"`) and an `element` prop representing the component to render (e.g., `<Projects />`).

### `Link`
`<Link>` is a navigation component provided by React Router that renders an anchor tag (`<a>`) under the hood but intercepts click events. Instead of letting the browser request a new page from the server, it instructs the history manager to transition path names internally.

### `useState`
`useState` is a React Hook that allows functional components to store and update local state. It returns an array containing two items: the current state value and a setter function to update that value. Updating state schedules a re-render of the component.

### Controlled Components
A Controlled Component is an input element (like `<input>`, `<textarea>`, or `<select>`) whose value is driven by React state rather than the DOM itself. To make a component controlled:
1. Bind its `value` attribute to a React state variable.
2. Update the state variable on changes using the `onChange` event handler.

---

## 4. Why `<Link>` is Preferred Over `<a>`
Standard HTML anchor tags (`<a href="...">`) force the browser to request the entire document from the server. This results in:
1. A complete page refresh, clearing the application state.
2. Slow performance because the browser must parse and load all scripts, styles, and assets again.

React Router's `<Link>` overrides this default behavior. Clicking it changes the URL path in the address bar using the History API without contacting the web server. React then hot-swaps components, delivering a fast experience.

---

## 5. How React Router Avoids Page Reloads
When a user clicks a `<Link>`, React Router intercepts the browser's default click-and-navigation event:
1. It calls `event.preventDefault()` to stop the browser from reloading the page.
2. It pushes the new path into the window's `history` object using `history.pushState()`.
3. It triggers an internal state update in the router context.
4. The `<Routes>` component detects the state change, identifies the new matching `<Route>`, and swaps the rendered page component dynamically in-memory.

---

## 6. Viva Exam Preparation: 20 Q&As

### Q1: What is a Single Page Application (SPA)?
**A:** An SPA is a web application that loads a single HTML document and dynamically updates its contents as the user interacts with it, rather than loading entire new pages from a server.

### Q2: What is Client-Side Routing?
**A:** Client-side routing is the process of handling page navigation internally within the browser using JavaScript (e.g., changing components based on URL path), without requesting a new HTML page from the web server.

### Q3: What is the purpose of `<BrowserRouter>`?
**A:** It wraps the application to enable routing capabilities by providing access to the HTML5 History API, keeping the UI in sync with the URL path.

### Q4: How does React Router v6 match paths?
**A:** It matches paths by analyzing the current URL pathname and rendering the child `<Route>` whose `path` matches best. In v6, matching is relative and prioritizes specific routes over general wildcards.

### Q5: What is the significance of the `path="*"` route?
**A:** The asterisk (`*`) serves as a wildcard matching any URL that hasn't been matched by preceding routes. It is used to display a custom 404 Not Found page.

### Q6: Why do we use `<Link>` instead of `<a href>`?
**A:** `<Link>` intercepts the click event, updates the URL, and swaps components without reloading the browser window. `<a href>` forces a full page reload and clears React state.

### Q7: What are React hooks?
**A:** Hooks are built-in functions in React (like `useState`, `useEffect`) that let you use state and other React features in functional components without writing class components.

### Q8: What does `useState` return?
**A:** It returns an array of two elements: the current state value, and a state setter function used to update the state and trigger re-renders.

### Q9: What is state in React?
**A:** State is an internal, mutable object owned by a component that holds data that may change over time, directly affecting what is rendered in the UI.

### Q10: How does state differ from props?
**A:** State is private and managed entirely *within* the component itself, whereas props (properties) are read-only data passed from a *parent* component down to a child.

### Q11: What is a controlled form component?
**A:** It is a form input whose current value is bound to a React state variable, with updates handled in React via change handlers (e.g. `onChange`), making React the single source of truth for the inputs.

### Q12: How do you capture user input in a controlled input box?
**A:** By assigning the state variable to the input's `value` attribute and using the `onChange` event to update the state via the setter function with `e.target.value`.

### Q13: What happens when you update state in React?
**A:** React schedules a re-render of the component and all of its child components. It updates the Virtual DOM, diffs it with the real DOM, and updates only the changed parts of the user interface.

### Q14: How did we create the character counter in our Contact form?
**A:** We bound the textbox value to a state variable (`message`) and displayed its length dynamically using `{message.length}` in our JSX.

### Q15: How did we implement the Show/Hide Help Toggle?
**A:** We created a boolean state (`showHelp`), toggled it on button click (`setShowHelp(!showHelp)`), and conditionally rendered the help text block using the logical AND operator: `{showHelp && <HelpComponent />}`.

### Q16: How does the theme toggler change the appearance of the entire page?
**A:** The theme state (`light`/`dark`) is declared in the root `App.jsx` component. It applies a corresponding class (`light-theme` or `dark-theme`) to the wrapper container. The CSS uses custom properties (variables) that automatically swap colors depending on the active class.

### Q17: What does the `to` prop represent in a `<Link>`?
**A:** The `to` prop defines the destination URL path that the browser history should navigate to when clicked.

### Q18: What is Component Reusability?
**A:** It is the practice of designing modular UI elements (like `Navbar`, `Footer`, or `ThemeToggle`) once, and reusing them across different pages to reduce code duplication and ease maintenance.

### Q19: What is React Router DOM?
**A:** It is the web-specific binding package for React Router, providing browser-friendly routing components like `BrowserRouter`, `Link`, and `Routes`.

### Q20: What is the Virtual DOM?
**A:** A lightweight, in-memory representation of the real DOM. React updates the Virtual DOM first, compares it using a diffing algorithm, and updates the real DOM efficiently in batches.
