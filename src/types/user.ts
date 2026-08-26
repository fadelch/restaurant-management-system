import type { Prisma } from "@/generated/prisma";

export type PublicUser = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true };
}>;

export type ManagedUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    isAdmin: true;
    isBanned: true;
    createdAt: true;
  };
}>;

export type SessionUser = PublicUser & {
  isAdmin: boolean;
  isSuperAdmin: boolean;
};
