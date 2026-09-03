import { loadEnvConfig } from "@next/env";
import { hash } from "bcrypt";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

loadEnvConfig(process.cwd());

const baseUrl = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");

function requiredSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sessionToken(userId: string) {
  const encoded = Buffer.from(
    JSON.stringify({
      userId,
      sessionVersion: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", requiredSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function runBrowserProbe(token: string, orderId: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/browser-health-check.mjs", baseUrl], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SMOKE_SESSION_COOKIE: token,
        SMOKE_TEST_CUSTOMER_INTERACTIONS: "true",
        SMOKE_EXTRA_ROUTES: JSON.stringify([
          "/profile/orders",
          `/order-confirmation/${orderId}`,
        ]),
        SMOKE_ARABIC_ROUTES: JSON.stringify(["/cart", "/profile/orders"]),
        SMOKE_MOBILE_ROUTES: JSON.stringify(["/cart", "/profile/orders"]),
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Browser probe exited with code ${code}.`));
    });
  });
}

async function main() {
  const { default: prisma } = await import("../src/lib/prisma");
  const suffix = randomUUID();
  const email = `browser-customer-${suffix}@example.invalid`;
  const customerId = randomUUID();
  const foodTypeId = randomUUID();
  const foodId = randomUUID();
  const orderId = randomUUID();

  await prisma.user.create({
    data: {
      id: customerId,
      name: "Browser regression customer",
      email,
      password: await hash(randomUUID(), 12),
    },
  });
  await prisma.foodType.create({
    data: { id: foodTypeId, name: `Browser regression ${suffix}` },
  });
  await prisma.food.create({
    data: {
      id: foodId,
      name: `Browser regression food ${suffix}`,
      description: "Temporary Run 7 browser fixture",
      ingredients: ["Fixture ingredient"],
      optionalIngredients: [{ name: "Fixture extra", price: 0.5 }],
      extraCheesePrice: 0.75,
      qty: 5,
      minStock: 1,
      price: 4.25,
      typeId: foodTypeId,
    },
  });
  await prisma.order.create({
    data: {
      id: orderId,
      userId: customerId,
      total: 4.25,
      subtotal: 4.25,
      status: "done",
      paymentStatus: "done",
      customerName: "Browser regression customer",
      fulfillmentType: "pickup",
      paymentMethod: "Cash on Pickup",
      items: {
        create: {
          foodId,
          foodName: `Browser regression food ${suffix}`,
          quantity: 1,
          price: 4.25,
        },
      },
    },
  });

  try {
    const report = JSON.parse(
      await runBrowserProbe(sessionToken(customerId), orderId),
    );
    const interaction = report.pages.find(
      (page: { label: string }) => page.label === "customer-menu-cart-favorites",
    );
    const detail = report.pages.find(
      (page: { label: string }) => page.label === "customer-food-detail",
    );
    const variants = report.pages.filter(
      (page: { label: string }) =>
        page.label.startsWith("arabic:") || page.label.startsWith("mobile:"),
    );
    const orderList = report.pages.find(
      (page: { label: string }) => page.label === "extra:/profile/orders",
    );
    const orderConfirmation = report.pages.find(
      (page: { label: string }) =>
        page.label === `extra:/order-confirmation/${orderId}`,
    );
    const favoriteCount = await prisma.favorite.count({ where: { userId: customerId } });
    const passed = Boolean(
      interaction?.initialMenu?.cards > 0 &&
      interaction.initialMenu.categories >= 2 &&
      interaction.initialMenu.availabilityOptions === 3 &&
      interaction.initialMenu.sortOptions === 4 &&
      interaction.filteredMenu?.cards === 0 &&
      interaction.filteredMenu.noMatches === true &&
      interaction.resetCards === interaction.initialMenu.cards &&
      interaction.favoriteClicked &&
      interaction.favoriteAdded &&
      interaction.favoritePersisted &&
      interaction.favoriteRemoved &&
      favoriteCount === 0 &&
      interaction.addClicked &&
      interaction.cartAdded?.rows === 1 &&
      interaction.cartAdded.quantity === 1 &&
      interaction.cartBefore?.hasItem &&
      interaction.cartBefore.hasCheckout &&
      interaction.quantityAfterIncrease === 2 &&
      interaction.cartPersisted &&
      interaction.checkout?.opened &&
      interaction.checkout.focusInside &&
      interaction.checkout.submitDisabled &&
      interaction.checkout.safeUnavailableMessage &&
      interaction.checkout.closeAvailable &&
      interaction.cartRemoved &&
      interaction.console?.length === 0 &&
      interaction.httpErrors?.length === 0 &&
      detail?.detailClicked &&
      detail.path === `/food/${foodId}` &&
      detail.heading === `Browser regression food ${suffix}` &&
      detail.ingredients &&
      detail.optionalIngredients &&
      detail.hasAddButton &&
      !detail.horizontalOverflow &&
      detail.brokenImages === 0 &&
      detail.console?.length === 0 &&
      detail.httpErrors?.length === 0 &&
      new URL(orderList?.finalUrl).pathname === "/profile/orders" &&
      !orderList.hasRuntimeError &&
      orderList.console?.length === 0 &&
      new URL(orderConfirmation?.finalUrl).pathname ===
        `/order-confirmation/${orderId}` &&
      !orderConfirmation.hasRuntimeError &&
      orderConfirmation.console?.length === 0 &&
      variants.length === 4 &&
      variants.every((page: {
        label: string;
        lang: string;
        dir: string;
        horizontalOverflow: boolean;
        hasRuntimeError: boolean;
        brokenImages: unknown[];
        console: unknown[];
      }) =>
        !page.horizontalOverflow &&
        !page.hasRuntimeError &&
        page.brokenImages.length === 0 &&
        page.console.length === 0 &&
        (page.label.startsWith("arabic:")
          ? page.lang === "ar" && page.dir === "rtl"
          : page.lang === "en" && page.dir === "ltr"),
      ),
    );

    console.log(JSON.stringify({
      status: passed ? "PASS" : "FAIL",
      menuCartFavorites: interaction,
      foodDetail: detail,
      orders: {
        listUrl: orderList?.finalUrl,
        confirmationUrl: orderConfirmation?.finalUrl,
      },
      responsiveAndRtl: variants.map((page: {
        label: string;
        finalUrl: string;
        lang: string;
        dir: string;
        horizontalOverflow: boolean;
      }) => ({
        label: page.label,
        finalUrl: page.finalUrl,
        lang: page.lang,
        dir: page.dir,
        horizontalOverflow: page.horizontalOverflow,
      })),
      fixtureCleanupReady: favoriteCount === 0,
    }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await prisma.favorite.deleteMany({ where: { userId: customerId } });
    await prisma.foodIssueReport.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: customerId } });
    await prisma.food.deleteMany({ where: { id: foodId } });
    await prisma.foodType.deleteMany({ where: { id: foodTypeId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Customer browser probe failed.");
  process.exitCode = 1;
});
