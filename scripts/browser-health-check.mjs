import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const sessionCookie = process.env.SMOKE_SESSION_COOKIE;
const sessionUserEmail = process.env.SMOKE_USER_EMAIL;
const loginEmail = process.env.SMOKE_LOGIN_EMAIL;
const loginPassword = process.env.SMOKE_LOGIN_PASSWORD;
const testAdminConfirmations =
  process.env.SMOKE_TEST_ADMIN_CONFIRMATIONS === "true";
const testCustomerInteractions =
  process.env.SMOKE_TEST_CUSTOMER_INTERACTIONS === "true";
const testDeleteFoodId = process.env.SMOKE_TEST_DELETE_FOOD_ID;
const parsedExtraRoutes = JSON.parse(process.env.SMOKE_EXTRA_ROUTES || "[]");
const extraRoutes = Array.isArray(parsedExtraRoutes)
  ? parsedExtraRoutes
  : [parsedExtraRoutes];
const parsedArabicRoutes = JSON.parse(
  process.env.SMOKE_ARABIC_ROUTES || "[]",
);
const arabicRoutes = Array.isArray(parsedArabicRoutes)
  ? parsedArabicRoutes
  : [parsedArabicRoutes];
const parsedMobileRoutes = JSON.parse(
  process.env.SMOKE_MOBILE_ROUTES || "[]",
);
const mobileRoutes = Array.isArray(parsedMobileRoutes)
  ? parsedMobileRoutes
  : [parsedMobileRoutes];
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findBrowser() {
  const candidates = [
    path.join(
      process.env.PROGRAMFILES || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    path.join(
      process.env.PROGRAMFILES || "",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed Chromium browser.
    }
  }
  throw new Error("Chrome or Edge was not found.");
}

async function openPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForJson(url, timeout = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // The browser is still starting.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) {
        listener(message.params || {});
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  once(method, timeout = 15_000) {
    return new Promise((resolve, reject) => {
      const listeners = this.listeners.get(method) || [];
      const timer = setTimeout(() => reject(new Error(`Timed out on ${method}`)), timeout);
      const listener = (params) => {
        clearTimeout(timer);
        const current = this.listeners.get(method) || [];
        this.listeners.set(
          method,
          current.filter((item) => item !== listener),
        );
        resolve(params);
      };
      listeners.push(listener);
      this.listeners.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

function argumentText(argument) {
  if ("value" in argument) {
    return typeof argument.value === "string"
      ? argument.value
      : JSON.stringify(argument.value);
  }
  return argument.description || argument.type || "unknown";
}

const browserPath = await findBrowser();
const debuggingPort = await openPort();
const profileDirectory = await mkdtemp(path.join(tmpdir(), "restaurant-smoke-"));
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

let client;
try {
  await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
  const targetResponse = await fetch(
    `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(baseUrl)}`,
    { method: "PUT" },
  );
  if (!targetResponse.ok) throw new Error("Could not create a browser target.");
  const target = await targetResponse.json();
  client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  let activeCapture = null;
  client.on("Runtime.consoleAPICalled", (event) => {
    if (!activeCapture || !["error", "warning"].includes(event.type)) return;
    activeCapture.console.push({
      level: event.type,
      text: event.args.map(argumentText).join(" "),
    });
  });
  client.on("Runtime.exceptionThrown", (event) => {
    if (!activeCapture) return;
    activeCapture.console.push({
      level: "error",
      text: event.exceptionDetails?.exception?.description ||
        event.exceptionDetails?.text ||
        "Uncaught exception",
    });
  });
  client.on("Log.entryAdded", ({ entry }) => {
    if (!activeCapture || !["error", "warning"].includes(entry.level)) return;
    activeCapture.console.push({ level: entry.level, text: entry.text });
  });
  client.on("Network.responseReceived", ({ response }) => {
    if (!activeCapture || response.status < 400) return;
    activeCapture.httpErrors.push({ status: response.status, url: response.url });
  });
  client.on("Network.loadingFailed", (event) => {
    if (!activeCapture || event.canceled) return;
    activeCapture.networkFailures.push({
      error: event.errorText,
      type: event.type,
    });
  });

  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Log.enable"),
    client.send("Network.enable"),
    client.send("Performance.enable"),
    client.send("Security.enable"),
  ]);
  if (sessionCookie) {
    const cookie = await client.send("Network.setCookie", {
      name: "restaurant_session",
      value: sessionCookie,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    });
    if (!cookie.success) throw new Error("Could not set the smoke-test session.");
  }
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__healthMetrics = { cls: 0, lcp: null, inp: null };
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latest = entries[entries.length - 1];
          if (latest) {
            const element = latest.element;
            window.__healthMetrics.lcp = {
              startTime: latest.startTime,
              renderTime: latest.renderTime,
              loadTime: latest.loadTime,
              size: latest.size,
              url: latest.url || null,
              element: element
                ? {
                    tagName: element.tagName,
                    id: element.id || null,
                    className: element.getAttribute("class"),
                    src: element.currentSrc || element.src || null,
                  }
                : null,
            };
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__healthMetrics.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!window.__healthMetrics.inp || entry.duration > window.__healthMetrics.inp) {
              window.__healthMetrics.inp = entry.duration;
            }
          }
        }).observe({ type: "event", buffered: true, durationThreshold: 16 });
      } catch {}
    `,
  });
  if (sessionUserEmail) {
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `sessionStorage.setItem("userEmail", ${JSON.stringify(sessionUserEmail)});`,
    });
  }

  async function visit(label, route) {
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    const loaded = client.once("Page.loadEventFired");
    const navigation = await client.send("Page.navigate", {
      url: `${baseUrl}${route}`,
    });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await loaded;
    await sleep(2_000);
    const evaluation = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const paint = performance.getEntriesByName("first-contentful-paint")[0];
        const resources = performance.getEntriesByType("resource").map((entry) => ({
          name: entry.name,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          responseEnd: Math.round(entry.responseEnd),
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          initiatorType: entry.initiatorType,
        }));
        const transferredBytes = resources.reduce(
          (total, resource) => total + resource.transferSize,
          navigation?.transferSize || 0,
        );
        const encodedBodyBytes = resources.reduce(
          (total, resource) => total + resource.encodedBodySize,
          navigation?.encodedBodySize || 0,
        );
        const decodedBodyBytes = resources.reduce(
          (total, resource) => total + resource.decodedBodySize,
          navigation?.decodedBodySize || 0,
        );
        return {
          title: document.title,
          url: location.href,
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          textLength: document.body.innerText.length,
          hasRuntimeError: (() => {
            const portal = document.querySelector("nextjs-portal");
            const text = portal?.shadowRoot?.textContent || "";
            return /Runtime Error|Build Error|Unhandled Runtime Error/.test(text);
          })(),
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          images: Array.from(document.images).map((image) => ({
            src: image.currentSrc || image.src,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            visible: (() => {
              const box = image.getBoundingClientRect();
              const style = getComputedStyle(image);
              return style.display !== "none" && box.width > 0 && box.height > 0;
            })(),
          })),
          metrics: {
            ttfb: navigation ? Math.round(navigation.responseStart) : null,
            fcp: paint ? Math.round(paint.startTime) : null,
            lcp: window.__healthMetrics?.lcp
              ? Math.round(window.__healthMetrics.lcp.startTime)
              : null,
            cls: window.__healthMetrics?.cls ?? null,
            inp: window.__healthMetrics?.inp ? Math.round(window.__healthMetrics.inp) : null,
            domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
            load: navigation ? Math.round(navigation.loadEventEnd) : null,
          },
          lcpElement: window.__healthMetrics?.lcp || null,
          network: {
            requestCount: resources.length + 1,
            transferredBytes,
            encodedBodyBytes,
            decodedBodyBytes,
            finish: Math.max(
              navigation?.loadEventEnd || 0,
              ...resources.map((resource) => resource.responseEnd),
            ),
          },
          resources,
        };
      })()`,
      returnByValue: true,
    });
    const page = evaluation.result.value;
    const brokenImages = page.images.filter(
      (image) => image.visible && image.complete && image.naturalWidth === 0,
    );
    const slowResources = page.resources
      .filter((resource) => resource.duration >= 1_000)
      .sort((first, second) => second.duration - first.duration)
      .slice(0, 10);
    const largestResources = page.resources
      .filter((resource) => resource.transferSize > 0)
      .sort((first, second) => second.transferSize - first.transferSize)
      .slice(0, 10);
    return {
      label,
      requestedRoute: route,
      finalUrl: page.url,
      title: page.title,
      lang: page.lang,
      dir: page.dir,
      textLength: page.textLength,
      hasRuntimeError: page.hasRuntimeError,
      horizontalOverflow: page.horizontalOverflow,
      imageCount: page.images.length,
      brokenImages,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
      metrics: page.metrics,
      lcpElement: page.lcpElement,
      network: page.network,
      imageResources: page.resources
        .filter(
          (resource) =>
            resource.initiatorType === "img" ||
            resource.name.includes("/_next/image?"),
        )
        .sort((first, second) => second.transferSize - first.transferSize),
      initialJavaScript: {
        requestCount: page.resources.filter(
          (resource) => resource.initiatorType === "script",
        ).length,
        transferredBytes: page.resources
          .filter((resource) => resource.initiatorType === "script")
          .reduce((total, resource) => total + resource.transferSize, 0),
      },
      slowResources,
      largestResources,
    };
  }

  const pages = [];
  pages.push(await visit("home-desktop-en", "/"));
  await client.send("Runtime.evaluate", {
    expression: `localStorage.setItem("restaurantLanguage", "ar")`,
  });
  pages.push(await visit("home-desktop-ar", "/"));
  await client.send("Runtime.evaluate", {
    expression: `localStorage.setItem("restaurantLanguage", "en")`,
  });
  pages.push(await visit("login", "/login"));

  async function submitLogin(label, emailValue, passwordValue) {
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    const submitted = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const setValue = (element, value) => {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set;
          setter.call(element, value);
          element.dispatchEvent(new Event("input", { bubbles: true }));
        };
        const email = document.querySelector('input[type="email"]');
        const password = document.querySelector('input[type="password"]');
        const form = document.querySelector("form");
        if (!email || !password || !form) return false;
        setValue(email, ${JSON.stringify(emailValue)});
        setValue(password, ${JSON.stringify(passwordValue)});
        form.requestSubmit();
        return true;
      })()`,
      returnByValue: true,
    });
    await sleep(3_000);
    const state = await client.send("Runtime.evaluate", {
      expression: `({
        url: location.href,
        rejected: document.body.innerText.includes("Invalid email or password"),
      })`,
      returnByValue: true,
    });
    return {
      label,
      submitted: submitted.result.value,
      ...state.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    };
  }

  if (loginEmail && loginPassword) {
    pages.push(await submitLogin("valid-login", loginEmail, loginPassword));
    pages.push(await visit("admin-authenticated-refresh", "/Admin"));

    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    const logout = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (item) => {
            const label = item.textContent?.trim().toLowerCase();
            return label === "logout" || label === "تسجيل الخروج";
          },
        );
        if (!button) return false;
        button.click();
        return true;
      })()`,
      returnByValue: true,
    });
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const location = await client.send("Runtime.evaluate", {
        expression: "location.pathname",
        returnByValue: true,
      });
      if (location.result.value !== "/Admin") break;
      await sleep(250);
    }
    const logoutState = await client.send("Runtime.evaluate", {
      expression: `({ url: location.href })`,
      returnByValue: true,
    });
    pages.push({
      label: "logout",
      clicked: logout.result.value,
      ...logoutState.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });

    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    await client.send("Runtime.evaluate", { expression: "history.back()" });
    await sleep(1_500);
    const backAfterLogout = await client.send("Runtime.evaluate", {
      expression: `({
        url: location.href,
        adminContentVisible: document.body.innerText.includes("Admin Dashboard"),
      })`,
      returnByValue: true,
    });
    pages.push({
      label: "back-after-logout",
      ...backAfterLogout.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });
    pages.push(await visit("protected-route-after-logout", "/Admin"));

    pages.push(await visit("login-again", "/login"));
    pages.push(await submitLogin("valid-login-again", loginEmail, loginPassword));
  } else {
    pages.push(
      await submitLogin(
        "invalid-login",
        "codex.invalid@example.invalid",
        "Invalid!Password9",
      ),
    );
  }
  pages.push(await visit("signup", "/signup"));
  pages.push(await visit("admin-unauthenticated", "/Admin"));
  pages.push(await visit("cart-unauthenticated", "/cart"));
  pages.push(await visit("announcements-unauthenticated", "/announcements"));
  pages.push(await visit("not-found", "/definitely-not-a-route"));
  for (const route of extraRoutes) {
    pages.push(await visit(`extra:${route}`, route));
  }

  if (testCustomerInteractions) {
    pages.push(await visit("customer-menu-setup", "/"));
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    const initialMenu = await client.send("Runtime.evaluate", {
      expression: `({
        cards: document.querySelectorAll('[role="link"]').length,
        categories: document.querySelectorAll('select')[0]?.options.length || 0,
        availabilityOptions: document.querySelectorAll('select')[1]?.options.length || 0,
        sortOptions: document.querySelectorAll('select')[2]?.options.length || 0,
      })`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('input[type="search"]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(input, "__run_7_no_match__");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`,
      returnByValue: true,
    });
    await sleep(300);
    const filteredMenu = await client.send("Runtime.evaluate", {
      expression: `({
        cards: document.querySelectorAll('[role="link"]').length,
        noMatches: document.body.innerText.includes("No matching foods"),
      })`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const reset = Array.from(document.querySelectorAll("button")).find(
          (button) => button.textContent?.trim() === "Reset filters",
        );
        reset?.click();
        return Boolean(reset);
      })()`,
      returnByValue: true,
    });
    await sleep(300);
    const resetMenu = await client.send("Runtime.evaluate", {
      expression: `document.querySelectorAll('[role="link"]').length`,
      returnByValue: true,
    });
    const favoriteClicked = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll('[role="link"] button[aria-label]')).find(
          (item) => item.getAttribute("aria-label")?.startsWith("Add to favorites"),
        );
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    await sleep(3_000);
    const favoriteAdded = await client.send("Runtime.evaluate", {
      expression: `Boolean(Array.from(document.querySelectorAll('[role="link"] button[aria-label]')).find(
        (item) => item.getAttribute("aria-label")?.startsWith("Remove from favorites"),
      ))`,
      returnByValue: true,
    });
    pages.push(await visit("customer-favorite-refresh", "/"));
    const favoritePersisted = await client.send("Runtime.evaluate", {
      expression: `Boolean(Array.from(document.querySelectorAll('[role="link"] button[aria-label]')).find(
        (item) => item.getAttribute("aria-label")?.startsWith("Remove from favorites"),
      ))`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll('[role="link"] button[aria-label]')).find(
          (item) => item.getAttribute("aria-label")?.startsWith("Remove from favorites"),
        );
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    await sleep(3_000);
    const favoriteRemoved = await client.send("Runtime.evaluate", {
      expression: `!Array.from(document.querySelectorAll('[role="link"] button[aria-label]')).some(
        (item) => item.getAttribute("aria-label")?.startsWith("Remove from favorites"),
      )`,
      returnByValue: true,
    });
    const addClicked = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll('[role="link"] button')).find(
          (item) => item.textContent?.trim() === "Add to Cart" && !item.disabled,
        );
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    await sleep(3_000);
    const cartAdded = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const items = JSON.parse(localStorage.getItem("cartItems") || "[]");
        return { rows: items.length, quantity: items.reduce((sum, item) => sum + item.cartQty, 0) };
      })()`,
      returnByValue: true,
    });
    pages.push(await visit("customer-cart-interaction", "/cart"));
    const cartBefore = await client.send("Runtime.evaluate", {
      expression: `({
        hasItem: Boolean(document.querySelector('section[aria-label="Cart items"] article')),
        hasCheckout: document.body.innerText.includes("Continue to checkout"),
      })`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label^="Increase "]')?.click()`,
    });
    await sleep(250);
    const quantityAfterIncrease = await client.send("Runtime.evaluate", {
      expression: `JSON.parse(localStorage.getItem("cartItems") || "[]")[0]?.cartQty || 0`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label^="Decrease "]')?.click()`,
    });
    await sleep(250);
    pages.push(await visit("customer-cart-refresh", "/cart"));
    const cartPersisted = await client.send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector('section[aria-label="Cart items"] article'))`,
      returnByValue: true,
    });
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (item) => item.textContent?.trim() === "Continue to checkout",
        );
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    await sleep(3_000);
    const checkout = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const submit = dialog?.querySelector('button[type="submit"]');
        const close = dialog?.querySelector('button[aria-label="Close checkout"]');
        const result = {
          opened: Boolean(dialog),
          focusInside: Boolean(dialog?.contains(document.activeElement)),
          submitDisabled: Boolean(submit?.disabled),
          safeUnavailableMessage: Boolean(
            dialog?.textContent?.includes("Ordering is unavailable until the restaurant completes"),
          ),
          closeAvailable: Boolean(close),
        };
        close?.click();
        return result;
      })()`,
      returnByValue: true,
    });
    await sleep(250);
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (item) => item.textContent?.trim() === "Remove",
        );
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    });
    await sleep(250);
    const cartRemoved = await client.send("Runtime.evaluate", {
      expression: `document.body.innerText.includes("Your cart is empty")`,
      returnByValue: true,
    });
    pages.push({
      label: "customer-menu-cart-favorites",
      initialMenu: initialMenu.result.value,
      filteredMenu: filteredMenu.result.value,
      resetCards: resetMenu.result.value,
      favoriteClicked: favoriteClicked.result.value,
      favoriteAdded: favoriteAdded.result.value,
      favoritePersisted: favoritePersisted.result.value,
      favoriteRemoved: favoriteRemoved.result.value,
      addClicked: addClicked.result.value,
      cartAdded: cartAdded.result.value,
      cartBefore: cartBefore.result.value,
      quantityAfterIncrease: quantityAfterIncrease.result.value,
      cartPersisted: cartPersisted.result.value,
      checkout: checkout.result.value,
      cartRemoved: cartRemoved.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });

    pages.push(await visit("customer-food-detail-setup", "/"));
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    const detailClicked = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const card = document.querySelector('[role="link"]');
        card?.click();
        return Boolean(card);
      })()`,
      returnByValue: true,
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const pathname = await client.send("Runtime.evaluate", {
        expression: "location.pathname",
        returnByValue: true,
      });
      if (pathname.result.value.startsWith("/food/")) break;
      await sleep(100);
    }
    await sleep(500);
    const detailState = await client.send("Runtime.evaluate", {
      expression: `({
        path: location.pathname,
        heading: document.querySelector("h1")?.textContent?.trim() || null,
        ingredients: document.body.innerText.includes("Choose your ingredients"),
        optionalIngredients: document.body.innerText.includes("Optional ingredients"),
        hasAddButton: Array.from(document.querySelectorAll("button")).some(
          (button) => button.textContent?.trim().startsWith("Add to Cart"),
        ),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        brokenImages: Array.from(document.images).filter(
          (image) => image.complete && image.naturalWidth === 0,
        ).length,
      })`,
      returnByValue: true,
    });
    pages.push({
      label: "customer-food-detail",
      detailClicked: detailClicked.result.value,
      ...detailState.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });
  }
  await client.send("Runtime.evaluate", {
    expression: `localStorage.setItem("restaurantLanguage", "ar")`,
  });
  for (const route of arabicRoutes) {
    pages.push(await visit(`arabic:${route}`, route));
  }
  await client.send("Runtime.evaluate", {
    expression: `localStorage.setItem("restaurantLanguage", "en")`,
  });

  if (testAdminConfirmations) {
    await visit("confirmation-setup", "/Admin");
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    let opened = { result: { value: false } };
    for (let attempt = 0; attempt < 40; attempt += 1) {
      opened = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const button = Array.from(document.querySelectorAll("button")).find(
            (item) => item.textContent?.trim() === "Clear finished list",
          );
          if (!button || button.disabled) return false;
          button.click();
          return true;
        })()`,
        returnByValue: true,
      });
      if (opened.result.value) break;
      await sleep(250);
    }
    await sleep(250);
    const dialogState = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const buttons = dialog
          ? Array.from(dialog.querySelectorAll("button")).map(
              (button) => button.textContent?.trim(),
            )
          : [];
        const cancel = dialog
          ? Array.from(dialog.querySelectorAll("button")).find(
              (button) => button.textContent?.trim() === "Cancel",
            )
          : null;
        cancel?.click();
        return {
          dialogOpened: Boolean(dialog),
          focusInside: Boolean(dialog?.contains(document.activeElement)),
          title: dialog?.querySelector("h2")?.textContent?.trim() || null,
          buttons,
          cancelClicked: Boolean(cancel),
        };
      })()`,
      returnByValue: true,
    });
    await sleep(250);
    const closed = await client.send("Runtime.evaluate", {
      expression: `!document.querySelector('[role="dialog"]')`,
      returnByValue: true,
    });
    pages.push({
      label: "clear-finished-confirmation",
      buttonClicked: opened.result.value,
      ...dialogState.result.value,
      dialogClosed: closed.result.value,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });
  }

  if (testDeleteFoodId) {
    await visit(
      "delete-food-confirmation-setup",
      `/Admin/food/delete/${encodeURIComponent(testDeleteFoodId)}`,
    );
    activeCapture = { console: [], httpErrors: [], networkFailures: [] };
    let deleteClicked = { result: { value: false } };
    for (let attempt = 0; attempt < 40; attempt += 1) {
      deleteClicked = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const button = Array.from(document.querySelectorAll("button")).find(
            (item) => item.textContent?.trim() === "Yes, Delete Food",
          );
          if (!button || button.disabled) return false;
          button.click();
          return true;
        })()`,
        returnByValue: true,
      });
      if (deleteClicked.result.value) break;
      await sleep(250);
    }
    await sleep(250);
    const deleteDialog = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const buttons = dialog
          ? Array.from(dialog.querySelectorAll("button")).map(
              (button) => button.textContent?.trim(),
            )
          : [];
        const yes = dialog
          ? Array.from(dialog.querySelectorAll("button")).find(
              (button) => button.textContent?.trim() === "Yes",
            )
          : null;
        const focusInside = Boolean(dialog?.contains(document.activeElement));
        yes?.click();
        return {
          dialogOpened: Boolean(dialog),
          focusInside,
          title: dialog?.querySelector("h2")?.textContent?.trim() || null,
          buttons,
          yesClicked: Boolean(yes),
        };
      })()`,
      returnByValue: true,
    });
    let returnedToAdmin = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const location = await client.send("Runtime.evaluate", {
        expression: "location.pathname",
        returnByValue: true,
      });
      if (location.result.value === "/Admin") {
        returnedToAdmin = true;
        break;
      }
      await sleep(250);
    }
    pages.push({
      label: "delete-food-confirmation",
      deleteClicked: deleteClicked.result.value,
      ...deleteDialog.result.value,
      returnedToAdmin,
      console: activeCapture.console,
      httpErrors: activeCapture.httpErrors,
      networkFailures: activeCapture.networkFailures,
    });
  }

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  pages.push(await visit("home-mobile-en", "/"));
  for (const route of mobileRoutes) {
    pages.push(await visit(`mobile:${route}`, route));
  }

  const routes = [
    "/",
    "/login",
    "/signup",
    "/Admin",
    "/cart",
    "/announcements",
    "/definitely-not-a-route",
    ...extraRoutes,
  ];
  const http = [];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    http.push({
      route,
      status: response.status,
      location: response.headers.get("location"),
    });
  }
  const headerResponse = await fetch(`${baseUrl}/`, { redirect: "manual" });
  const headers = Object.fromEntries(
    [
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "permissions-policy",
      "content-security-policy",
      "strict-transport-security",
    ].map((name) => [name, headerResponse.headers.get(name)]),
  );

  console.log(
    JSON.stringify(
      {
        browser: path.basename(browserPath),
        baseUrl,
        extensionsDisabled: true,
        headers,
        http,
        pages,
      },
      null,
      2,
    ),
  );
} finally {
  client?.close();
  browser.kill();
  await sleep(250);
  await rm(profileDirectory, { recursive: true, force: true }).catch(() => {});
}
