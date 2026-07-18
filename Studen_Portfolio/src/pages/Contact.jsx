import { useState } from "react";

// Contact page component implementing controlled form inputs and help sections
function Contact() {
  // State for form inputs (Name, Email, Message)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");


  const [showHelp, setShowHelp] = useState(false);

 
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for contacting me, ${name}! Your message has been simulated as sent.`);
  };

  return (
    <div className="page-container contact-page" id="contact-page">
      <h1 className="page-title" id="contact-title">Contact Me</h1>
      <p className="page-subtitle">Get in touch by submitting the form below.</p>

      {/* Help Section State Toggle */}
      <div className="help-toggle-container" id="help-toggle-sec">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="help-btn"
          id="help-toggle-btn"
        >
          {showHelp ? "Hide Help" : "Show Help"}
        </button>
        
        {showHelp && (
          <div className="help-box" id="help-message-box">
            <p>Please enter your contact details.</p>
          </div>
        )}
      </div>

      <div className="contact-layout">
        {/* Controlled Form */}
        <form onSubmit={handleSubmit} className="contact-form" id="contact-form-el">
          <div className="form-group">
            <label htmlFor="input-name">Name</label>
            <input 
              type="text" 
              id="input-name"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your Name" 
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="input-email">Email</label>
            <input 
              type="email" 
              id="input-email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Your Email" 
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="input-message">Message</label>
            <textarea 
              id="input-message"
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Your Message" 
              rows="5"
              required
            ></textarea>
            {/* Character Counter */}
            <div className="character-counter" id="char-counter">
              Characters: {message.length}
            </div>
          </div>

          <button type="submit" className="submit-btn" id="form-submit-btn">
            Send Message
          </button>
        </form>

        {/* Real-time Display Section */}
        <div className="live-preview-box" id="live-preview">
          <h3>You typed (Real-time Preview):</h3>
          <div className="preview-field">
            <strong>Name:</strong> <span id="preview-name">{name || "(Empty)"}</span>
          </div>
          <div className="preview-field">
            <strong>Email:</strong> <span id="preview-email">{email || "(Empty)"}</span>
          </div>
          <div className="preview-field">
            <strong>Message:</strong> <span id="preview-message">{message || "(Empty)"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
