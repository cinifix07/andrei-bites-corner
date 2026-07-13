import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import logo from "../assets/OFFICAL-LOGO.png";
import "./landingpage.css";

function LandingPage({ onAdminLogin, onStaffLogin, onViewMenu }) {
  const convex = useConvex();
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState("");
  const [isAppInstalled, setIsAppInstalled] = useState(
    () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true,
  );
  const [adminCredentials, setAdminCredentials] = useState({
    username: "",
    password: "",
  });
  const [adminLoginError, setAdminLoginError] = useState("");
  const [isAdminSigningIn, setIsAdminSigningIn] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll("[data-reveal-section]");

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallMessage("");
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
      setInstallMessage("App installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleViewMenu = () => {
    setIsNoticeOpen(true);
  };

  const handleInstallApp = async () => {
    if (isAppInstalled) {
      setInstallMessage("Already installed");
      return;
    }

    if (!installPrompt) {
      setInstallMessage("Use your browser menu to install this app");
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallMessage(choice.outcome === "accepted" ? "Installing..." : "Install canceled");
  };

  const handleProceedToMenu = () => {
    setIsNoticeOpen(false);
    onViewMenu();
  };

  const handleAdminNo = () => {
    setIsAdminPromptOpen(false);
    setIsNoticeOpen(true);
  };

  const handleAdminYes = () => {
    setIsAdminPromptOpen(false);
    setIsAdminLoginOpen(true);
  };

  const handleAdminCredentialChange = (event) => {
    const { name, value } = event.target;
    setAdminLoginError("");
    setAdminCredentials((currentCredentials) => ({ ...currentCredentials, [name]: value }));
  };

  const handleAdminSignIn = async (event) => {
    event.preventDefault();
    setIsAdminSigningIn(true);
    setAdminLoginError("");

    try {
      const signedInUser = await convex.query(api.users.authenticate, {
        username: adminCredentials.username.trim(),
        password: adminCredentials.password,
      });

      if (!signedInUser) {
        setAdminLoginError("Invalid Credentials");
        return;
      }

      setIsAdminLoginOpen(false);
      if (signedInUser.role === "admin") {
        onAdminLogin();
      } else {
        onStaffLogin();
      }
    } catch {
      setAdminLoginError("Unable to sign in. Please try again.");
    } finally {
      setIsAdminSigningIn(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav">
          <a className="landing-brand" href="#top" aria-label="Andrei Bites Corner home">
            ANDREI BITES CORNER
          </a>

          <button className="landing-order-button" onClick={() => setIsAdminPromptOpen(true)} type="button">
            LOGIN
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="landing-hero reveal-section" data-reveal-section>
          <img
            alt="High-end, professional food photography of a gourmet wagyu beef burger with melted artisanal cheese, heirloom tomato, and crisp greens on a toasted brioche bun."
            className="landing-hero-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuASik6YrBR7eUb0T9J6ScHyx_HP2eY4KyJDUyin70UI9lR4DMha3I12KgSazPRfPi459d60IXTy4AX-6Gv9bHh0SNLI9w6GcBon_EZE__tNztOh6aktyWeg3c2EMWDkLooCGZVJhipiaVKZPmykRXtRuSs8mjcVFW0imJR0AIVfqv2aMfFgzNiT_JeIYUApwvp8k-D98uT1oxTGYuVLLX3H9PxacC2ouCfYla7gqf3G9wn9nxpJaOOn"
          />
          <div className="landing-hero-gradient" />

          <div className="landing-hero-content">
            <span className="landing-eyebrow">CRAFTED WITH PASSION</span>
            <h1>
              ANDREI BITES
              <br />
              <span>CORNER</span>
            </h1>
            <p>
              Discover a symphony of taste where every ingredient tells a story. From farm-to-table freshness to
              world-class culinary artistry.
            </p>
            <button className="landing-menu-button" onClick={handleViewMenu} type="button">
              View Menu <span className="material-symbols-outlined">restaurant_menu</span>
            </button>
          </div>

          <a className="landing-scroll-cue" href="#reservation" aria-label="Scroll to reservation section">
            <span className="material-symbols-outlined">expand_more</span>
          </a>
        </section>

        <section className="landing-menu-anchor reveal-section" data-reveal-section id="menu" aria-label="Menu" />

        <section className="landing-reservation reveal-section" data-reveal-section id="reservation">
          <div className="landing-container">
            <div className="reservation-card">
              <div className="reservation-info">
                <h2>
                  Experience
                  <br />
                  Excellence
                </h2>

                <div className="reservation-list">
                  <div className="reservation-item">
                    <span className="material-symbols-outlined">location_on</span>
                    <div>
                      <h3>Location</h3>
                      <p>
                        Lumbayao Highway,
                        <br />
                        Valencia City Buk.
                      </p>
                    </div>
                  </div>

                  <div className="reservation-item">
                    <span className="material-symbols-outlined">schedule</span>
                    <div>
                      <h3>Opening Hours</h3>
                      <p>
                        Mon - Sat: 8:00 AM - 8:00 PM
                        <br />
                        Sun: 1:00 PM - 8:30 PM
                      </p>
                    </div>
                  </div>

                  <div className="reservation-item">
                    <span className="material-symbols-outlined">contact_support</span>
                    <div>
                      <h3>Contact</h3>
                      <p>
                        ursalm349@gmail.com
                        <br />
                           0981-518-2668
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reservation-map">
                <iframe
                  allowFullScreen
                  aria-label="Google map showing Andrei Bites Corner location"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7903.033899849928!2d125.24563251335208!3d7.94540917255811!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32fee30078894559%3A0xefa6f888bfde726e!2sANREI%20BITES%20CORNER!5e0!3m2!1sen!2sph!4v1783772189102!5m2!1sen!2sph"
                  title="Andrei Bites Corner map"
                />

                <div className="map-badge">
                  <div className="map-badge-icon">
                    <span className="material-symbols-outlined">star</span>
                  </div>
                  <div>
                    <strong>Andrei Bites Corner</strong>
                    <p>2022 - 2023 - 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <button
        aria-label="Install Andrei Bites Corner web app"
        className="landing-install-button"
        onClick={handleInstallApp}
        title={isAppInstalled ? "App installed" : "Install app"}
        type="button"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {isAppInstalled ? "done" : "download"}
        </span>
        <span>{isAppInstalled ? "Installed" : "Install App"}</span>
      </button>
      {installMessage ? <div className="landing-install-toast" role="status">{installMessage}</div> : null}

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <strong>Andrei Bites Corner</strong>
            <p>&copy; 2026 Andrei Bites Corner. All rights reserved. | Developed by CINIFIX Teachnology</p>
          </div>
        </div>
      </footer>

      {isNoticeOpen ? (
        <div className="notice-modal-backdrop" role="presentation">
          <section
            aria-labelledby="notice-modal-title"
            aria-modal="true"
            className="notice-modal"
            role="dialog"
          >
            <button
              aria-label="Close notice"
              className="notice-modal-close"
              onClick={() => setIsNoticeOpen(false)}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <p className="notice-modal-kicker">NOTICE</p>
            <h2 id="notice-modal-title">Dear Valued Customers,</h2>

            <div className="notice-modal-copy">
              <p>
                Please be informed that <strong>ANDREI BITES CORNER</strong> now requires a{" "}
                <strong>30% down payment</strong> for all online orders to confirm.
              </p>
              <p>
                The required down payment must be settled before we begin preparing your order. The remaining balance
                will be paid upon pickup.
              </p>
              <p>
                This policy helps us ensure accurate order preparation and provides the best possible service to all our
                valued customers.
              </p>
              <p>Thank you for your understanding, trust, and continued support.</p>
              <p>
                <strong>ANDREI BITES CORNER</strong>
              </p>
            </div>

            <div className="notice-modal-actions">
              <button className="notice-secondary-button" onClick={() => setIsNoticeOpen(false)} type="button">
                Cancel
              </button>
              <button className="notice-primary-button" onClick={handleProceedToMenu} type="button">
                Proceed to Menu
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAdminPromptOpen ? (
        <div className="notice-modal-backdrop" role="presentation">
          <section
            aria-labelledby="admin-alert-title"
            aria-modal="true"
            className="notice-modal admin-alert-modal"
            role="dialog"
          >
            <button
              aria-label="Close administrator alert"
              className="notice-modal-close"
              onClick={() => setIsAdminPromptOpen(false)}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <p className="notice-modal-kicker">LOGIN</p>
            <h2 id="admin-alert-title">Administrator Only</h2>
            <div className="notice-modal-copy">
              <p>This login is only for the Administrator.</p>
              <p>
                <strong>Are you an ADMINISTRATOR?</strong>
              </p>
            </div>

            <div className="notice-modal-actions">
              <button className="notice-secondary-button" onClick={handleAdminNo} type="button">
                No
              </button>
              <button className="notice-primary-button" onClick={handleAdminYes} type="button">
                Yes
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAdminLoginOpen ? (
        <div className="notice-modal-backdrop" role="presentation">
          <section
            aria-labelledby="admin-login-title"
            aria-modal="true"
            className="notice-modal admin-login-modal"
            role="dialog"
          >
            <button
              aria-label="Close administrator login"
              className="notice-modal-close"
              onClick={() => setIsAdminLoginOpen(false)}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="admin-login-header">
              <img src={logo} alt="Andrei Bites Corner" />
              <p className="notice-modal-kicker">ADMINISTRATOR</p>
              <h2 id="admin-login-title">Sign In</h2>
            </div>

            <form className="admin-login-form" onSubmit={handleAdminSignIn}>
              <label>
                <span>User Name</span>
                <input
                  name="username"
                  onChange={handleAdminCredentialChange}
                  required
                  type="text"
                  value={adminCredentials.username}
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  name="password"
                  onChange={handleAdminCredentialChange}
                  required
                  type="password"
                  value={adminCredentials.password}
                />
              </label>

              {adminLoginError ? <p className="admin-login-error" role="alert">{adminLoginError}</p> : null}

              <button className="notice-primary-button admin-signin-button" disabled={isAdminSigningIn} type="submit">
                {isAdminSigningIn ? "SIGNING IN..." : "SIGN IN"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default LandingPage;
