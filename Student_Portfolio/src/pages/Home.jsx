
// Home page component displaying bio, introduction, and skills
function Home() {
  const skillsList = [
    "Python",
    "Computer Vision",
    "Deep Learning",
    "Research",
    "React.js",
    "Machine Learning"
  ];

  return (
    <div className="page-container home-page" id="home-page">
      <header className="hero-section">
        <h1 id="home-title">Hitarth Khatiwala</h1>
        <h2 id="home-subtitle">Dual Degree Student & Research Intern</h2>
        <p className="intro-text" id="home-intro">
          Welcome to my portfolio! I am an aspiring AI & Machine Learning engineer and Data Science enthusiast. 
          I love exploring deep learning model architectures, computer vision techniques, and building clean web apps.
        </p>
      </header>

      <section className="about-details" id="home-about">
        <h3>Academic Profile</h3>
        <p>
          Currently pursuing a <strong>B.Tech in Artificial Intelligence & Machine Learning (AIML)</strong> at CHARUSAT 
          and a <strong>BS in Data Science & Applications</strong> at IIT Madras.
        </p>
        <p>
          Active <strong>Research Intern at SVNIT</strong> working on state-of-the-art computer vision algorithms.
        </p>
      </section>

      <section className="skills-section" id="home-skills">
        <h3>Technical Skills</h3>
        <ul className="skills-grid">
          {skillsList.map((skill, index) => (
            <li key={index} className="skill-badge">
              {skill}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Home;
