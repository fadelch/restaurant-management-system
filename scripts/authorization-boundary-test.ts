import { loadEnvConfig } from "@next/env";
import { hash } from "bcrypt";
import { createHmac, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import prisma from "../src/lib/prisma";
import {
  getNotificationSummaryForCustomer,
  getOrderForCustomer,
  getOrdersForCustomer,
  markAllNotificationsReadForCustomer,
  markNotificationReadForCustomer,
} from "../src/server/customerAccessService";

loadEnvConfig(process.cwd());

const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;
const sessionCookie = "restaurant_session";

function requiredSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sessionToken(userId: string, expiresAt = Date.now() + 10 * 60 * 1000) {
  const encoded = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", requiredSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

async function waitForServer(process: ChildProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error("The production server exited before the probe started.");
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the production server.");
}

async function request(
  pathname: string,
  token?: string,
  method: "GET" | "POST" = "GET",
) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    redirect: "manual",
    headers: token ? { cookie: `${sessionCookie}=${token}` } : undefined,
  });
}

function redirectedToLogin(response: Response) {
  const location = response.headers.get("location");
  return (
    [303, 307, 308].includes(response.status) &&
    Boolean(location && new URL(location, baseUrl).pathname === "/login")
  );
}

async function stopServer(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => process.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

async function main() {
  const suffix = randomUUID();
  const password = await hash(randomUUID(), 12);
  const createdIds: string[] = [];
  const announcementIds: string[] = [];
  let server: ChildProcess | undefined;

  try {
    const [customer, otherCustomer, admin, bannedAdmin] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Authorization probe customer",
          email: `auth-customer-${suffix}@example.invalid`,
          password,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "Authorization probe second customer",
          email: `auth-customer-two-${suffix}@example.invalid`,
          password,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "Authorization probe admin",
          email: `auth-admin-${suffix}@example.invalid`,
          password,
          isAdmin: true,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "Authorization probe banned admin",
          email: `auth-banned-${suffix}@example.invalid`,
          password,
          isAdmin: true,
          isBanned: true,
        },
        select: { id: true },
      }),
    ]);
    createdIds.push(customer.id, otherCustomer.id, admin.id, bannedAdmin.id);

    const victimOrder = await prisma.order.create({
      data: {
        userId: otherCustomer.id,
        total: 12,
        subtotal: 12,
        customerName: "Authorization probe",
      },
      select: { id: true },
    });
    const announcement = await prisma.announcement.create({
      data: {
        title: "Authorization probe",
        message: "Temporary ownership boundary fixture",
        published: true,
        notifications: {
          create: [
            {
              userId: otherCustomer.id,
              title: "Authorization probe",
              message: "Temporary ownership boundary fixture",
            },
            {
              userId: customer.id,
              title: "Authorization probe own notification",
              message: "Temporary own-notification fixture",
            },
          ],
        },
      },
      select: {
        id: true,
        notifications: { select: { id: true, userId: true } },
      },
    });
    const secondAnnouncement = await prisma.announcement.create({
      data: {
        title: "Authorization probe mark all",
        message: "Temporary mark-all fixture",
        published: true,
        notifications: {
          create: {
            userId: customer.id,
            title: "Authorization probe second own notification",
            message: "Temporary mark-all fixture",
          },
        },
      },
      select: {
        id: true,
        notifications: { select: { id: true, userId: true } },
      },
    });
    announcementIds.push(announcement.id, secondAnnouncement.id);
    const allNotifications = [
      ...announcement.notifications,
      ...secondAnnouncement.notifications,
    ];
    const victimNotificationId = allNotifications.find(
      (notification) => notification.userId === otherCustomer.id,
    )?.id;
    const ownNotificationIds = allNotifications
      .filter((notification) => notification.userId === customer.id)
      .map((notification) => notification.id);
    if (!victimNotificationId) {
      throw new Error("Could not create the notification ownership fixture.");
    }

    const otherOrder = await getOrderForCustomer(customer.id, victimOrder.id);
    const customerOrders = await getOrdersForCustomer(customer.id);
    const notificationSummary = await getNotificationSummaryForCustomer(
      customer.id,
      8,
    );
    let foreignNotificationWriteDenied = false;
    try {
      await markNotificationReadForCustomer(
        customer.id,
        victimNotificationId,
      );
    } catch (error) {
      foreignNotificationWriteDenied =
        error instanceof Error && error.message === "Notification not found.";
    }
    const victimNotification = await prisma.notification.findUnique({
      where: { id: victimNotificationId },
      select: { read: true },
    });
    await markNotificationReadForCustomer(customer.id, ownNotificationIds[0]);
    const ownRead = await prisma.notification.findUnique({
      where: { id: ownNotificationIds[0] },
      select: { read: true },
    });
    await markAllNotificationsReadForCustomer(customer.id);
    const ownUnreadAfterMarkAll = await prisma.notification.count({
      where: { id: { in: ownNotificationIds }, read: false },
    });

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
    const superAdmin = superAdminEmail
      ? await prisma.user.findUnique({
          where: { email: superAdminEmail },
          select: { id: true, isBanned: true },
        })
      : null;

    const nextBin = path.join(
      process.cwd(),
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "ignore", "ignore"],
    });
    await waitForServer(server);

    const unauthenticated = await request("/Admin");
    const tampered = await request("/Admin", `${sessionToken(customer.id)}x`);
    const expired = await request(
      "/Admin",
      sessionToken(customer.id, Date.now() - 1_000),
    );
    const customerResponse = await request("/Admin", sessionToken(customer.id));
    const bannedResponse = await request(
      "/Admin",
      sessionToken(bannedAdmin.id),
    );
    const adminResponse = await request("/Admin", sessionToken(admin.id));
    const adminSuperResponse = await request(
      "/DeleteUser",
      sessionToken(admin.id),
    );
    const unauthenticatedSentry = await request(
      "/api/admin/sentry-test",
      undefined,
      "POST",
    );
    const customerSentry = await request(
      "/api/admin/sentry-test",
      sessionToken(customer.id),
      "POST",
    );
    const adminSentry = await request(
      "/api/admin/sentry-test",
      sessionToken(admin.id),
      "POST",
    );
    const superResponse =
      superAdmin && !superAdmin.isBanned
        ? await request("/DeleteUser", sessionToken(superAdmin.id))
        : null;

    const results = {
      unauthenticatedAdminDenied: redirectedToLogin(unauthenticated),
      tamperedSessionDenied: redirectedToLogin(tampered),
      expiredSessionDenied: redirectedToLogin(expired),
      customerAdminDenied: redirectedToLogin(customerResponse),
      bannedAdminDenied: redirectedToLogin(bannedResponse),
      adminAllowed: adminResponse.status === 200,
      adminSuperRouteDenied: redirectedToLogin(adminSuperResponse),
      unauthenticatedSentryDenied: unauthenticatedSentry.status === 401,
      customerSentryDenied: customerSentry.status === 403,
      productionAdminRateLimitFailsClosed: adminSentry.status === 503,
      foreignOrderDetailDenied: otherOrder === null,
      foreignOrderListExcluded: !customerOrders.some(
        (order) => order.id === victimOrder.id,
      ),
      foreignNotificationReadExcluded: !notificationSummary.items.some(
        (notification) => notification.id === victimNotificationId,
      ),
      foreignNotificationWriteDenied:
        foreignNotificationWriteDenied && victimNotification?.read === false,
      ownNotificationReadAllowed: ownRead?.read === true,
      ownNotificationsMarkAllAllowed: ownUnreadAfterMarkAll === 0,
      superAdminAllowed:
        superResponse === null ? "NOT TESTABLE" : superResponse.status === 200,
    };
    const requiredPassed = Object.entries(results)
      .filter(([name]) => name !== "superAdminAllowed")
      .every(([, passed]) => passed === true);

    console.log(
      JSON.stringify(
        { status: requiredPassed ? "PASS" : "FAIL", results },
        null,
        2,
      ),
    );
    if (!requiredPassed) process.exitCode = 1;
  } finally {
    if (server) await stopServer(server);
    if (announcementIds.length > 0) {
      await prisma.announcement.deleteMany({
        where: { id: { in: announcementIds } },
      });
    }
    if (createdIds.length > 0) {
      const fixtureOrders = await prisma.order.findMany({
        where: { userId: { in: createdIds } },
        select: { id: true },
      });
      const orderIds = fixtureOrders.map((order) => order.id);
      await prisma.foodIssueReport.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.stockMovement.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Authorization boundary probe failed.",
  );
  process.exitCode = 1;
});
