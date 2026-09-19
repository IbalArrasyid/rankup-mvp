import { decryptCredentialValue, type EncryptedValue } from "@/lib/credentials";
import { getPrisma } from "@/lib/prisma";
import { getPaymentConfirmationUpdate, validateProgressUpdate } from "@/domain/admin-order";
import { getCompletionAssignmentUpdate } from "@/domain/assignment";
import { getRankTierForStar } from "@/domain/rank";
import { validateOrderTransition } from "@/domain/status-transitions";
import { ORDER_STATUS_META } from "@/domain/status";
import type { ServiceMode } from "@/domain/service-mode";
import { Prisma, type OrderStatus, type PaymentStatus } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export class AdminOrderError extends Error {}

export type AdminOrderFilters = {
  page?: number;
  serviceMode?: ServiceMode;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

function createCredentialValue(ciphertext: string, iv: string, authTag: string): EncryptedValue {
  return { ciphertext, iv, authTag };
}

function getProgressMessage(absoluteStar: number): string {
  const tier = getRankTierForStar(absoluteStar);
  if (!tier) throw new AdminOrderError("Progress rank tidak valid.");
  return `Progress diperbarui ke ${tier.label} ${absoluteStar} ⭐.`;
}

function getOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const query = filters.search?.trim();
  const normalizedWhatsapp = query?.replace(/\D/g, "");
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (query) {
  if (filters.serviceMode) where.serviceMode = filters.serviceMode;
    where.OR = [
      { publicId: { contains: query, mode: "insensitive" } },
      { customerName: { contains: query, mode: "insensitive" } },
      ...(normalizedWhatsapp
        ? [{ whatsapp: { contains: normalizedWhatsapp } }]
        : []),
    ];
  }

  return where;
}

export async function getAdminDashboard() {
  const prisma = getPrisma();
  const statuses: OrderStatus[] = [
    "AWAITING_PAYMENT",
    "PAID",
    "WAITING_JOKI",
    "IN_PROGRESS",
    "QC",
    "COMPLETED",
  ];
  const [total, ...counts] = await Promise.all([
    prisma.order.count(),
    ...statuses.map((status) => prisma.order.count({ where: { status } })),
    prisma.joki.count({ where: { status: "ACTIVE", availability: "AVAILABLE" } }),
    prisma.joki.count({ where: { availability: "BUSY" } }),
    prisma.orderAssignment.count({ where: { status: "ACTIVE" } }),
  ]);
  const latestOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      publicId: true,
      customerName: true,
      initialAbsoluteStar: true,
      targetAbsoluteStar: true,
      total: true,
      serviceMode: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    total,
    counts: Object.fromEntries(statuses.map((status, index) => [status, counts[index]])) as Record<OrderStatus, number>,
    jokiAvailable: counts[statuses.length],
    jokiBusy: counts[statuses.length + 1],
    activeAssignments: counts[statuses.length + 2],
    latestOrders,
  };
}

export async function getAdminOrders(filters: AdminOrderFilters) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const where = getOrderWhere(filters);
  const prisma = getPrisma();
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        publicId: true,
        customerName: true,
        whatsapp: true,
        initialAbsoluteStar: true,
        targetAbsoluteStar: true,
        progressAbsoluteStar: true,
        serviceMode: true,
        total: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return { orders, page, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminOrder(publicId: string) {
  return getPrisma().order.findUnique({
    where: { publicId },
    include: {
      credentials: { select: { id: true, loginMethod: true, createdAt: true } },
      events: { orderBy: { createdAt: "asc" } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, action: true, createdAt: true },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          endedAt: true,
          joki: { select: { publicId: true, name: true, peakAbsoluteStar: true, roles: true, availability: true } },
        },
      },
      jobPostings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          publicId: true,
          status: true,
          publishedAt: true,
          claimedAt: true,
          cancelledAt: true,
          claimedByJoki: { select: { publicId: true, name: true } },
        },
      },
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { publicId: true, provider: true, method: true, status: true, amount: true, currency: true, providerInvoiceNumber: true, paidAt: true, expiresAt: true, createdAt: true },
      },
    },
  });
}

export async function recordAdminLoginAttempt(success: boolean): Promise<void> {
  await getPrisma().adminAuditLog.create({
    data: { action: success ? "ADMIN_LOGIN_SUCCESS" : "ADMIN_LOGIN_FAILED" },
  });
}

export async function markOrderPaymentPaid(publicId: string): Promise<{ changed: boolean }> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!order) throw new AdminOrderError("Pesanan tidak ditemukan.");

    const update = getPaymentConfirmationUpdate(order.status, order.paymentStatus);
    if (!update.changed) return { changed: false };

    const result = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: { status: update.nextStatus, paymentStatus: "PAID" },
    });
    if (result.count === 0) return { changed: false };

    await Promise.all([
      tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PAYMENT_UPDATED",
          status: update.nextStatus,
          publicMessage: "Pembayaran dikonfirmasi oleh admin.",
        },
      }),
      tx.adminAuditLog.create({ data: { action: "PAYMENT_MARKED_PAID_MANUALLY", orderId: order.id } }),
    ]);
    return { changed: true };
  });
}

export async function changeAdminOrderStatus(publicId: string, nextStatus: OrderStatus): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        progressAbsoluteStar: true,
        targetAbsoluteStar: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { id: true, jokiId: true, startedAt: true },
        },
      },
    });
    if (!order) throw new AdminOrderError("Pesanan tidak ditemukan.");
    if (nextStatus === "ASSIGNED") throw new AdminOrderError("Gunakan penugasan joki untuk status ini.");

    const activeAssignment = order.assignments[0];
    validateOrderTransition({
      currentStatus: order.status,
      nextStatus,
      paymentStatus: order.paymentStatus,
      progressAbsoluteStar: order.progressAbsoluteStar,
      targetAbsoluteStar: order.targetAbsoluteStar,
      hasActiveAssignment: Boolean(activeAssignment),
    });

    const update = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus },
      data: { status: nextStatus },
    });
    if (update.count === 0) {
      throw new AdminOrderError("Pesanan baru saja diperbarui. Muat ulang dan coba lagi.");
    }
    const now = new Date();
    if (order.status === "ASSIGNED" && nextStatus === "IN_PROGRESS" && activeAssignment && !activeAssignment.startedAt) {
      await tx.orderAssignment.updateMany({
        where: { id: activeAssignment.id, status: "ACTIVE", startedAt: null },
        data: { startedAt: now },
      });
    }
    if (nextStatus === "COMPLETED" && activeAssignment) {
      const lifecycle = getCompletionAssignmentUpdate(true);
      const assignmentUpdate = await tx.orderAssignment.updateMany({
        where: { id: activeAssignment.id, status: "ACTIVE" },
        data: { status: lifecycle.assignmentStatus, endedAt: now },
      });
      if (assignmentUpdate.count === 0) throw new AdminOrderError("Penugasan baru saja berubah.");
      await tx.joki.update({ where: { id: activeAssignment.jokiId }, data: { availability: lifecycle.jokiAvailability } });
    }
    await Promise.all([
      tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS_CHANGED",
          status: nextStatus,
          publicMessage: `Status pesanan diperbarui menjadi ${ORDER_STATUS_META[nextStatus].label}.`,
        },
      }),
      tx.adminAuditLog.create({
        data: { action: "ORDER_STATUS_CHANGED", orderId: order.id, metadata: { status: nextStatus } },
      }),
    ]);
  });
}

export async function updateAdminOrderProgress(publicId: string, nextAbsoluteStar: number): Promise<{ changed: boolean }> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      select: {
        id: true,
        initialAbsoluteStar: true,
        progressAbsoluteStar: true,
        targetAbsoluteStar: true,
      },
    });
    if (!order) throw new AdminOrderError("Pesanan tidak ditemukan.");

    const progress = validateProgressUpdate(
      order.initialAbsoluteStar,
      order.progressAbsoluteStar,
      order.targetAbsoluteStar,
      nextAbsoluteStar,
    );
    if (!progress.changed) return { changed: false };

    const update = await tx.order.updateMany({
      where: { id: order.id, progressAbsoluteStar: order.progressAbsoluteStar },
      data: { progressAbsoluteStar: progress.nextAbsoluteStar },
    });
    if (update.count === 0) {
      throw new AdminOrderError("Pesanan baru saja diperbarui. Muat ulang dan coba lagi.");
    }
    await Promise.all([
      tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PROGRESS_UPDATED",
          publicMessage: getProgressMessage(progress.nextAbsoluteStar),
        },
      }),
      tx.adminAuditLog.create({
        data: {
          action: "ORDER_PROGRESS_UPDATED",
          orderId: order.id,
          metadata: { progressAbsoluteStar: progress.nextAbsoluteStar },
        },
      }),
    ]);
    return { changed: true };
  });
}

export type RevealedCredential = {
  loginMethod: string;
  identifier: string;
  secret: string;
  accountId: string;
  serverId: string;
  notes: string | null;
};

export async function revealAdminOrderCredential(publicId: string): Promise<RevealedCredential | null> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      select: {
        id: true, serviceMode: true,
        credentials: {
          select: {
            loginMethod: true,
            identifierCiphertext: true,
            identifierIv: true,
            identifierAuthTag: true,
            secretCiphertext: true,
            secretIv: true,
            secretAuthTag: true,
            accountIdCiphertext: true,
            accountIdIv: true,
            accountIdAuthTag: true,
            serverIdCiphertext: true,
            serverIdIv: true,
            serverIdAuthTag: true,
            notesCiphertext: true,
            notesIv: true,
            notesAuthTag: true,
          },
        },
      },
    });
    if (!order?.credentials || order.serviceMode !== "ACCOUNT") return null;

    const credential = order.credentials;
    const revealed: RevealedCredential = {
      loginMethod: credential.loginMethod,
      identifier: decryptCredentialValue(createCredentialValue(credential.identifierCiphertext, credential.identifierIv, credential.identifierAuthTag)),
      secret: decryptCredentialValue(createCredentialValue(credential.secretCiphertext, credential.secretIv, credential.secretAuthTag)),
      accountId: decryptCredentialValue(createCredentialValue(credential.accountIdCiphertext, credential.accountIdIv, credential.accountIdAuthTag)),
      serverId: decryptCredentialValue(createCredentialValue(credential.serverIdCiphertext, credential.serverIdIv, credential.serverIdAuthTag)),
      notes: credential.notesCiphertext && credential.notesIv && credential.notesAuthTag
        ? decryptCredentialValue(createCredentialValue(credential.notesCiphertext, credential.notesIv, credential.notesAuthTag))
        : null,
    };

    await tx.adminAuditLog.create({ data: { action: "CREDENTIAL_REVEALED", orderId: order.id } });
    return revealed;
  });
}
