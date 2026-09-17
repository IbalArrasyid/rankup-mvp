import { Prisma, type JokiAvailability, type JokiRole, type JokiStatus } from "@/generated/prisma/client";
import { generatePublicJokiId } from "@/domain/joki-id";
import { isJokiEligibleForOrder } from "@/domain/joki";
import type { ServiceMode } from "@/domain/service-mode";
import { getPrisma } from "@/lib/prisma";
import type { JokiProfileInput } from "@/validation/joki";

const PAGE_SIZE = 20;

export class AdminJokiError extends Error {}

export type AdminJokiFilters = {
  page?: number;
  search?: string;
  status?: JokiStatus;
  availability?: JokiAvailability;
  role?: JokiRole;
};

function normalizeNullable(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function getJokiWhere(filters: AdminJokiFilters): Prisma.JokiWhereInput {
  const query = filters.search?.trim();
  const normalizedWhatsapp = query?.replace(/\D/g, "");
  const where: Prisma.JokiWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.availability) where.availability = filters.availability;
  if (filters.role) where.roles = { has: filters.role };
  if (query) {
    where.OR = [
      { publicId: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      ...(normalizedWhatsapp ? [{ whatsapp: { contains: normalizedWhatsapp } }] : []),
    ];
  }
  return where;
}

export async function getAdminJokis(filters: AdminJokiFilters) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const where = getJokiWhere(filters);
  const prisma = getPrisma();
  const [total, jokis] = await Promise.all([
    prisma.joki.count({ where }),
    prisma.joki.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        publicId: true,
        name: true,
        whatsapp: true,
        peakAbsoluteStar: true,
        serviceModes: true,
        roles: true,
        status: true,
        availability: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { order: { select: { publicId: true } } },
        },
        _count: { select: { assignments: { where: { status: "COMPLETED" } } } },
      },
    }),
  ]);

  return { jokis, page, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminJoki(publicId: string) {
  const prisma = getPrisma();
  const joki = await prisma.joki.findUnique({
    where: { publicId },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          endedAt: true,
          order: {
            select: {
              publicId: true,
              status: true,
              initialAbsoluteStar: true,
              targetAbsoluteStar: true,
              progressAbsoluteStar: true,
              serviceMode: true,
            },
          },
        },
      },
    },
  });
  if (!joki) return null;

  const grouped = await prisma.orderAssignment.groupBy({
    by: ["status"],
    where: { jokiId: joki.id },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((entry) => [entry.status, entry._count._all]));
  return {
    ...joki,
    assignmentCounts: {
      total: grouped.reduce((sum, entry) => sum + entry._count._all, 0),
      active: counts.ACTIVE ?? 0,
      completed: counts.COMPLETED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
    },
  };
}

export async function createAdminJoki(input: JokiProfileInput, whatsapp: string) {
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = generatePublicJokiId();
    try {
      return await prisma.$transaction(async (tx) => {
        const joki = await tx.joki.create({
          data: {
            publicId,
            name: input.name,
            whatsapp,
            telegramUsername: normalizeNullable(input.telegramUsername),
            peakAbsoluteStar: input.peakStar,
            currentAbsoluteStar: input.currentStar ?? null,
            serviceModes: input.serviceModes,
            roles: input.roles,
            heroPool: input.heroPool,
            status: input.status,
            availability: input.availability,
            notes: normalizeNullable(input.notes),
          },
        });
        await tx.adminAuditLog.create({ data: { action: "JOKI_CREATED", metadata: { jokiPublicId: publicId } } });
        return joki;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new AdminJokiError("ID joki tidak dapat dibuat. Coba lagi.");
}

export async function updateAdminJoki(publicId: string, input: JokiProfileInput, whatsapp: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.joki.findUnique({
      where: { publicId },
      select: { id: true, assignments: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
    });
    if (!existing) throw new AdminJokiError("Joki tidak ditemukan.");

    const hasActiveAssignment = existing.assignments.length > 0;
    const availability = hasActiveAssignment ? "BUSY" : input.availability;
    const joki = await tx.joki.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        whatsapp,
        telegramUsername: normalizeNullable(input.telegramUsername),
        peakAbsoluteStar: input.peakStar,
        currentAbsoluteStar: input.currentStar ?? null,
        serviceModes: input.serviceModes,
        roles: input.roles,
        heroPool: input.heroPool,
        status: input.status,
        availability,
        notes: normalizeNullable(input.notes),
      },
    });
    await tx.adminAuditLog.create({ data: { action: "JOKI_UPDATED", metadata: { jokiPublicId: publicId } } });
    return joki;
  });
}

export async function getEligibleJokis(targetAbsoluteStar: number, orderServiceMode: ServiceMode) {
  const jokis = await getPrisma().joki.findMany({
    where: {
      status: "ACTIVE",
      availability: "AVAILABLE",
      peakAbsoluteStar: { gte: targetAbsoluteStar },
      serviceModes: { has: orderServiceMode },
      assignments: { none: { status: "ACTIVE" } },
    },
    orderBy: [{ peakAbsoluteStar: "asc" }, { name: "asc" }],
    select: {
      publicId: true,
      name: true,
      peakAbsoluteStar: true,
      serviceModes: true,
      roles: true,
      status: true,
      availability: true,
    },
  });
  return jokis.filter((joki) => isJokiEligibleForOrder({
    ...joki,
    targetAbsoluteStar,
    orderServiceMode,
    hasActiveAssignment: false,
  }));
}
