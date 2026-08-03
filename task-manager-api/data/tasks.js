/**
 * In-memory data store for tasks.
 */
let tasks = [
  {
    id: 1,
    title: "Learn Node.js",
    completed: true
  },
  {
    id: 2,
    title: "Master Express.js Middleware",
    completed: false
  },
  {
    id: 3,
    title: "Build RESTful APIs",
    completed: false
  }
];

// Internal tracking counter for incremental IDs
let currentId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;

/**
 * Generates the next unique incremental task ID.
 * @returns {number}
 */
const getNextId = () => {
  currentId += 1;
  return currentId;
};

module.exports = {
  tasks,
  getNextId
};
