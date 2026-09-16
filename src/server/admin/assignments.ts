import { getUnassignmentUpdate, validateJokiAssignment } from "@/domain/assignment";
import { getManualAssignmentJobPostingUpdate } from "@/domain/job-pool";
import { validateOrderTransition } from "@/domain/status-transitions";
import { getPrisma } from "@/lib/prisma";

export class AdminAssignmentError extends Error {}

export async function assignJokiToOrder(orderPublicId: string, jokiPublicId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId: orderPublicId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        progressAbsoluteStar: true,
        targetAbsoluteStar: true,
      },
    });
    if (!order) throw new AdminAssignmentError("Pesanan tidak ditemukan.");

    const joki = await tx.joki.findUnique({
      where: { publicId: jokiPublicId },
      select: { id: true, publicId: true, status: true, availability: true, peakAbsoluteStar: true },
    });
    if (!joki) throw new AdminAssignmentError("Joki tidak ditemukan.");

    const [orderAssignment, jokiAssignment] = await Promise.all([
      tx.orderAssignment.findFirst({ where: { orderId: order.id, status: "ACTIVE" }, select: { id: true } }),
      tx.orderAssignment.findFirst({ where: { jokiId: joki.id, status: "ACTIVE" }, select: { id: true } }),
    ]);
    validateJokiAssignment({
      order: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        targetAbsoluteStar: order.targetAbsoluteStar,
        hasActiveAssignment: Boolean(orderAssignment),
      },
      joki: {
        status: joki.status,
        availability: joki.availability,
        peakAbsoluteStar: joki.peakAbsoluteStar,
        hasActiveAssignment: Boolean(jokiAssignment),
      },
    });

    validateOrderTransition({
      currentStatus: order.status,
      nextStatus: "ASSIGNED",
      paymentStatus: order.paymentStatus,
      progressAbsoluteStar: order.progressAbsoluteStar,
      targetAbsoluteStar: order.targetAbsoluteStar,
      hasActiveAssignment: true,
    });

    await tx.orderAssignment.create({ data: { orderId: order.id, jokiId: joki.id, status: "ACTIVE" } });
    const jokiUpdate = await tx.joki.updateMany({
      where: { id: joki.id, status: "ACTIVE", availability: "AVAILABLE" },
      data: { availability: "BUSY" },
    });
    if (jokiUpdate.count === 0) throw new AdminAssignmentError("Ketersediaan joki baru saja berubah.");
    const orderUpdate = await tx.order.updateMany({
      where: { id: order.id, status: "WAITING_JOKI", paymentStatus: "PAID" },
      data: { status: "ASSIGNED" },
    });
    if (orderUpdate.count === 0) throw new AdminAssignmentError("Status pesanan baru saja berubah.");
    const jobPostingUpdate = getManualAssignmentJobPostingUpdate();
    await tx.jobPosting.updateMany({
      where: { orderId: order.id, status: "OPEN" },
      data: { status: jobPostingUpdate.jobStatus, cancelledAt: new Date() },
    });

    await Promise.all([
      tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS_CHANGED",
          status: "ASSIGNED",
          publicMessage: "Joki telah ditugaskan untuk pesanan ini.",
        },
      }),
      tx.adminAuditLog.create({
        data: { action: "JOKI_ASSIGNED", orderId: order.id, metadata: { jokiPublicId: joki.publicId } },
      }),
    ]);
  }, { isolationLevel: "Serializable" });
}

export async function unassignJokiFromOrder(orderPublicId: string, reason?: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId: orderPublicId },
      select: {
        id: true,
        status: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { id: true, jokiId: true, joki: { select: { publicId: true } } },
        },
      },
    });
    if (!order) throw new AdminAssignmentError("Pesanan tidak ditemukan.");
    const assignment = order.assignments[0];
    const lifecycle = getUnassignmentUpdate(order.status, Boolean(assignment));
    if (!assignment) throw new AdminAssignmentError("Tidak ada penugasan aktif untuk dibatalkan.");

    const endedAt = new Date();
    const assignmentUpdate = await tx.orderAssignment.updateMany({
      where: { id: assignment.id, status: "ACTIVE" },
      data: { status: lifecycle.assignmentStatus, endedAt },
    });
    if (assignmentUpdate.count === 0) throw new AdminAssignmentError("Penugasan baru saja berubah.");
    await tx.joki.update({ where: { id: assignment.jokiId }, data: { availability: lifecycle.jokiAvailability } });
    const orderUpdate = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: lifecycle.orderStatus },
    });
    if (orderUpdate.count === 0) throw new AdminAssignmentError("Status pesanan baru saja berubah.");

    await Promise.all([
      tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS_CHANGED",
          status: lifecycle.orderStatus,
          publicMessage: "Penugasan joki diperbarui.",
        },
      }),
      tx.adminAuditLog.create({
        data: {
          action: "JOKI_UNASSIGNED",
          orderId: order.id,
          metadata: { jokiPublicId: assignment.joki.publicId, ...(reason ? { reason } : {}) },
        },
      }),
    ]);
  }, { isolationLevel: "Serializable" });
}
