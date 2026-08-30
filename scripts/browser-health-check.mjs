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
const parsedExtraRoutes = JSON.parse(process.env.SMOKE_EXTRA_ROUTES || "[]");
const extraRoutes = Array.isArray(parsedExtraRoutes)
  ? parsedExtraRoutes
  : [parsedExtraRoutes];
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

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  pages.push(await visit("home-mobile-en", "/"));

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
