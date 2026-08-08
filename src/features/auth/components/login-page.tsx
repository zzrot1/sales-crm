"use client";

import { useState } from "react";

import { getBackendUrl } from "@/common/config";
import { getGoogleUrl } from "@/service-api/generated/endpoints/auth/auth";

import styles from "./index.module.css";

export function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const googleLoginUrl = `${getBackendUrl()}${getGoogleUrl()}`;

  function handleGoogleLogin(event: React.MouseEvent<HTMLAnchorElement>) {
    if (isRedirecting) {
      event.preventDefault();
      return;
    }

    setIsRedirecting(true);
  }

  return (
    <main className={styles.loginScreen}>
      <section className={styles.loginPanel} aria-label="Login">
        <div className={styles.brandMark}>
          <span className={styles.brandSymbol} aria-hidden="true" />
          <span className={styles.brandName}>
            <span aria-hidden="true">.</span>myCRM
          </span>
        </div>

        <div className={styles.loginCopy}>
          <h1>Welcome Back!</h1>
          <p>Sign in with your Google account to continue.</p>
        </div>

        <a
          className={styles.googleLoginButton}
          href={googleLoginUrl}
          onClick={handleGoogleLogin}
          aria-disabled={isRedirecting}
        >
          <span className={styles.googleIcon} aria-hidden="true">
            G
          </span>
          {isRedirecting ? "Opening Google..." : "Login with Google"}
        </a>
      </section>

      <section className={styles.loginShowcase} aria-label="Product preview">
        <div className={styles.showcaseGrid} aria-hidden="true">
          <div className={`${styles.showcaseOrbit} ${styles.showcaseOrbitOne}`} />
          <div className={`${styles.showcaseOrbit} ${styles.showcaseOrbitTwo}`} />
          <div className={styles.showcaseAvatar}>
            <div className={styles.avatarHead} />
            <div className={styles.avatarBody} />
            <div className={styles.avatarLaptop} />
          </div>
        </div>
      </section>
    </main>
  );
}
