import "./Spinner.css";

// Easy, reusable Spinner component
function Spinner({ size = "medium", text = "Loading..." }) {
  return (
    <div className="spinner-container" id="spinner-container">
      <div className={`spinner spinner-${size}`} id="spinner-circle" />
      {text && <p className="spinner-text" id="spinner-text">{text}</p>}
    </div>
  );
}

export default Spinner;
