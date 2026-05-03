// Injects the site header and footer directly into every page.
// Works with file:// (no server needed).

(function () {
  const currentScript = document.currentScript;
  const siteRootHref = currentScript && currentScript.src
    ? new URL("../", currentScript.src).href
    : new URL("./", window.location.href).href;

  const headerHTML = `
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-logo" href="${new URL("index.html", siteRootHref).href}"><img src="${new URL("Images/Logo.png", siteRootHref).href}" alt="Solver Space" class="site-logo-img" /></a>
    <button class="site-menu-toggle" id="menu-toggle" aria-label="Toggle menu" aria-expanded="false">
      <span class="menu-icon"><span></span></span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Main navigation">
      <a class="site-nav-link" href="${new URL("index.html", siteRootHref).href}"  data-page="index"  data-i18n="nav.home">Hem</a>
      <a class="site-nav-link" href="${new URL("math-list.html", siteRootHref).href}" data-page="math-list" data-i18n="nav.mathlist">Math List</a>
      <a class="site-nav-link" href="${new URL("about.html", siteRootHref).href}" data-page="about" data-i18n="nav.about">Om</a>
    </nav>
    <select id="lang-select" class="lang-select" aria-label="Language / Språk / Kieli">
      <option value="sv">Svenska</option>
      <option value="en">English</option>
      <option value="fi">Suomi</option>
    </select>
  </div>
</header>`;

  const footerHTML = `
<footer class="site-footer">
  <div class="site-footer-inner">
    <div class="site-footer-brand-block">
      <a class="site-footer-logo" href="${new URL("index.html", siteRootHref).href}" data-i18n="footer.logo">Solver Space</a>
      <p class="site-footer-tagline" data-i18n="footer.tagline">Online math tools for clearer practice and better review.</p>
      <p class="site-footer-note" data-i18n="footer.note">&copy; 2026 &middot; Byggd för elever</p>
    </div>

    <div class="site-footer-links-grid">
      <nav class="site-footer-column" aria-label="Main tools">
        <p class="site-footer-column-title" data-i18n="footer.colMain">Main tools</p>
        <a href="${new URL("solver.html", siteRootHref).href}" data-i18n="footer.linkSolver">Equation Solver</a>
        <a href="${new URL("linear.html", siteRootHref).href}" data-i18n="footer.linkLinear">Linear Worksheet</a>
        <a href="${new URL("balance.html", siteRootHref).href}" data-i18n="footer.linkBalance">Balance Scale</a>
      </nav>

      <nav class="site-footer-column" aria-label="Practice links">
        <p class="site-footer-column-title" data-i18n="footer.colPractice">Practice</p>
        <a href="${new URL("quiz.html", siteRootHref).href}" data-i18n="footer.linkQuiz">Live Quiz</a>
        <a href="${new URL("premade-quiz.html", siteRootHref).href}" data-i18n="footer.linkPremade">Premade Quiz</a>
        <a href="${new URL("test-me.html", siteRootHref).href}" data-i18n="footer.linkTestMe">Test Me</a>
      </nav>

      <nav class="site-footer-column" aria-label="Explore links">
        <p class="site-footer-column-title" data-i18n="footer.colExplore">Explore</p>
        <a href="${new URL("math-list.html", siteRootHref).href}" data-i18n="footer.linkMathList">Math List</a>
        <a href="${new URL("about.html", siteRootHref).href}" data-i18n="footer.linkAbout">About</a>
        <a href="${new URL("index.html", siteRootHref).href}" data-i18n="footer.linkHome">Home</a>
      </nav>

      <div class="site-footer-column" aria-label="Support notes">
        <p class="site-footer-column-title" data-i18n="footer.colWhy">Why use it</p>
        <span data-i18n="footer.why1">Step-by-step help</span>
        <span data-i18n="footer.why2">Visual equation learning</span>
        <span data-i18n="footer.why3">History-based review</span>
      </div>
    </div>
  </div>
</footer>`;

  // Inject header
  const headerMount = document.getElementById("site-header-mount");
  if (headerMount) {
    headerMount.outerHTML = headerHTML;
  }

  // Inject footer
  const footerMount = document.getElementById("site-footer-mount");
  if (footerMount) {
    footerMount.outerHTML = footerHTML;
  }

  // Menu toggle functionality
  setTimeout(function () {
    const menuToggle = document.getElementById("menu-toggle");
    const siteNav = document.getElementById("site-nav");
    if (menuToggle && siteNav) {
      menuToggle.addEventListener("click", function () {
        siteNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", siteNav.classList.contains("is-open"));
      });
      // Close menu when a link is clicked
      siteNav.querySelectorAll(".site-nav-link").forEach(function (link) {
        link.addEventListener("click", function () {
          siteNav.classList.remove("is-open");
          menuToggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }, 0);

  // Highlight the active nav link
  const page = window.location.pathname.split("/").pop().replace(".html", "") || "index";
  document.querySelectorAll(".site-nav-link").forEach(function (link) {
    if (link.dataset.page === page) {
      link.classList.add("site-nav-active");
    }
  });

  // Apply saved / default language (i18n.js must be loaded before menu.js)
  if (typeof window.applyLanguage === "function") {
    window.applyLanguage();
  }

  // Language selector change handler
  setTimeout(function () {
    const langSelect = document.getElementById("lang-select");
    if (langSelect) {
      langSelect.addEventListener("change", function () {
        window.applyLanguage(this.value);
      });
    }
  }, 0);

  function createSkeletonLine(extraClass) {
    const line = document.createElement("div");
    line.className = `page-skeleton-line ${extraClass || ""}`.trim();
    return line;
  }

  function getCardCandidates(block) {
    const selectors = [
      "article",
      "[class*='card']",
      ".quiz-choices > *",
      ".solver-support-grid > *",
      ".math-list-grid > *",
      ".math-list-grid-3 > *",
      ".about-features-grid > *",
      ".about-creators-grid > *",
      ".premade-grid > *",
      ".recent-grid > *"
    ];

    const seen = new Set();
    const matches = [];

    selectors.forEach((selector) => {
      block.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el)) {
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 56) {
          return;
        }
        seen.add(el);
        matches.push(el);
      });
    });

    return matches.slice(0, 8);
  }

  function buildGenericSkeleton() {
    const main = document.querySelector("main.app-shell, main");
    if (!main) {
      return null;
    }

    // Skip only when a page explicitly opts out.
    if (main.hasAttribute("data-skeleton-optout")) {
      return null;
    }

    const majorBlocks = Array.from(main.children).filter((node) =>
      node.matches("header, section, article") && !node.hidden
    );

    if (!majorBlocks.length) {
      return null;
    }

    document.body.classList.add("page-loading-enabled");
    main.dataset.skeletonLoading = "true";

    const skeleton = document.createElement("section");
    skeleton.id = "pageSkeleton";
    skeleton.className = "page-skeleton";
    skeleton.setAttribute("aria-hidden", "true");

    const mainRect = main.getBoundingClientRect();

    majorBlocks.forEach((block) => {
      const shell = document.createElement("div");
      const isHero = block.matches("header") || block.className.indexOf("hero") !== -1;
      const blockRect = block.getBoundingClientRect();
      const relativeTop = Math.max(0, blockRect.top - mainRect.top);
      const relativeLeft = Math.max(0, blockRect.left - mainRect.left);
      const blockWidth = Math.max(0, blockRect.width);
      const blockHeight = Math.max(110, blockRect.height);

      shell.className = isHero
        ? "page-skeleton-block page-skeleton-block-hero"
        : "page-skeleton-block page-skeleton-block-panel";
      shell.style.top = `${relativeTop}px`;
      shell.style.left = `${relativeLeft}px`;
      shell.style.width = `${blockWidth}px`;
      shell.style.height = `${blockHeight}px`;

      if (isHero) {
        shell.appendChild(createSkeletonLine("page-skeleton-line-kicker"));
        shell.appendChild(createSkeletonLine("page-skeleton-line-title"));
        shell.appendChild(createSkeletonLine("page-skeleton-line-subtitle"));

        const actions = document.createElement("div");
        actions.className = "page-skeleton-actions";
        actions.appendChild(createSkeletonLine("page-skeleton-chip"));
        actions.appendChild(createSkeletonLine("page-skeleton-chip"));
        shell.appendChild(actions);
      } else {
        shell.appendChild(createSkeletonLine("page-skeleton-line-heading"));
        shell.appendChild(createSkeletonLine("page-skeleton-line-body"));
        shell.appendChild(createSkeletonLine("page-skeleton-line-body page-skeleton-line-body-short"));

        const cardNodes = getCardCandidates(block);
        cardNodes.forEach((cardNode) => {
          const cardRect = cardNode.getBoundingClientRect();
          const ghost = document.createElement("div");
          ghost.className = "page-skeleton-card page-skeleton-card-ghost";
          ghost.style.top = `${Math.max(0, cardRect.top - blockRect.top)}px`;
          ghost.style.left = `${Math.max(0, cardRect.left - blockRect.left)}px`;
          ghost.style.width = `${Math.max(0, cardRect.width)}px`;
          ghost.style.height = `${Math.max(46, cardRect.height)}px`;
          shell.appendChild(ghost);
        });
      }

      skeleton.appendChild(shell);
    });

    main.insertBefore(skeleton, main.firstChild);
    return { main, skeleton };
  }

  function hideGenericSkeleton(state) {
    if (!state || !state.main || !state.skeleton) {
      return;
    }
    if (state.main.dataset.skeletonLoading === "false") {
      return;
    }

    state.main.dataset.skeletonLoading = "false";

    window.setTimeout(function () {
      if (state.skeleton && state.skeleton.parentNode) {
        state.skeleton.parentNode.removeChild(state.skeleton);
      }
    }, 260);
  }

  const genericSkeletonState = buildGenericSkeleton();
  if (genericSkeletonState) {
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        hideGenericSkeleton(genericSkeletonState);
      }, 140);
    });

    // Fallback if load is delayed by third-party resources.
    window.setTimeout(function () {
      hideGenericSkeleton(genericSkeletonState);
    }, 1400);
  }
})();
