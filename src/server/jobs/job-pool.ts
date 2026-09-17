import { Prisma, type JobPostingStatus } from "@/generated/prisma/client";
import { validateJokiAssignment } from "@/domain/assignment";
import { generatePublicJobId } from "@/domain/job-id";
import { getOpenJobCancellationState, getSuccessfulJobClaimState, getTelegramStartState, JobPoolError, validateJobPublication } from "@/domain/job-pool";
import { isJokiEligibleForOrder, isTelegramJokiEligibleForOrder } from "@/domain/joki";
import { getPrisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export class JobClaimError extends Error {}
export class JobPoolServiceError extends Error {}

export type AdminJobFilters = {
  page?: number;
  search?: string;
  status?: JobPostingStatus;
};

type TelegramJobRecipient = {
  publicId: string;
  telegramUserId: string;
};

export async function getEligibleTelegramJokis(targetAbsoluteStar: number, orderServiceMode: import("@/domain/service-mode").ServiceMode): Promise<TelegramJobRecipient[]> {
  const jokis = await getPrisma().joki.findMany({
    where: {
      status: "ACTIVE",
      availability: "AVAILABLE",
      telegramUserId: { not: null },
      peakAbsoluteStar: { gte: targetAbsoluteStar },
      assignments: { none: { status: "ACTIVE" } },
      serviceModes: { has: orderServiceMode },
    },
    select: { publicId: true, telegramUserId: true, status: true, availability: true, peakAbsoluteStar: true, serviceModes: true },
    orderBy: { publicId: "asc" },
  });
  return jokis.filter((joki): joki is typeof joki & { telegramUserId: string } =>
    isTelegramJokiEligibleForOrder({ ...joki, targetAbsoluteStar, orderServiceMode, hasActiveAssignment: false }),
  ).map((joki) => ({ publicId: joki.publicId, telegramUserId: joki.telegramUserId }));
}

async function createOpenPosting(orderPublicId: string) {
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = generatePublicJobId();
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { publicId: orderPublicId },
          select: {
            id: true,
            publicId: true,
            status: true,
            paymentStatus: true,
            initialAbsoluteStar: true,
            targetAbsoluteStar: true,
            serviceMode: true,
            progressAbsoluteStar: true,
            assignments: { where: { status: "ACTIVE" }, take: 1, select: { id: true } },
            jobPostings: { where: { status: "OPEN" }, take: 1, select: { id: true } },
          },
        });
        if (!order) throw new JobPoolServiceError("Pesanan tidak ditemukan.");
        validateJobPublication({
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          hasActiveAssignment: Boolean(order.assignments[0]),
          hasOpenPosting: Boolean(order.jobPostings[0]),
        });
        const job = await tx.jobPosting.create({ data: { publicId, orderId: order.id } });
        await tx.adminAuditLog.create({ data: { action: "JOB_PUBLISHED", orderId: order.id, metadata: { jobPublicId: publicId } } });
        return { job, order };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof JobPoolError || error instanceof JobPoolServiceError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.jobPosting.findFirst({ where: { status: "OPEN", order: { publicId: orderPublicId } }, select: { id: true } });
        if (existing) throw new JobPoolServiceError("Pesanan sudah memiliki Job Pool terbuka.");
        continue;
      }
      throw error;
    }
  }
  throw new JobPoolServiceError("Job belum dapat dibuat. Coba lagi.");
}

export async function publishJobPosting(orderPublicId: string) {
  const result = await createOpenPosting(orderPublicId);
  const recipients = await getEligibleTelegramJokis(result.order.targetAbsoluteStar, result.order.serviceMode);
  // Recipients are recomputed from the persisted order mode immediately after publication.
  return { ...result, recipients };
}

export async function getAdminJobs(filters: AdminJobFilters) {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const query = filters.search?.trim();
  const where: Prisma.JobPostingWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(query ? { OR: [{ publicId: { contains: query, mode: "insensitive" } }, { order: { publicId: { contains: query, mode: "insensitive" } } }] } : {}),
  };
  const prisma = getPrisma();
  const [total, jobs] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        publicId: true, status: true, publishedAt: true, claimedAt: true, cancelledAt: true,
        order: { select: { publicId: true, initialAbsoluteStar: true, targetAbsoluteStar: true } },
        claimedByJoki: { select: { publicId: true, name: true } },
      },
    }),
  ]);
  return { jobs, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function cancelOpenJobPosting(jobPublicId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const job = await tx.jobPosting.findUnique({ where: { publicId: jobPublicId }, select: { id: true, orderId: true, status: true } });
    if (!job) throw new JobPoolServiceError("Job sudah tidak tersedia untuk dibatalkan.");
    const cancellation = getOpenJobCancellationState(job.status);
    const cancelled = await tx.jobPosting.updateMany({ where: { id: job.id, status: "OPEN" }, data: { status: cancellation.jobStatus, cancelledAt: new Date() } });
    if (cancelled.count !== 1) throw new JobPoolServiceError("Job sudah tidak tersedia untuk dibatalkan.");
    await tx.adminAuditLog.create({ data: { action: "JOB_CANCELLED", orderId: job.orderId, metadata: { jobPublicId } } });
  }, { isolationLevel: "Serializable" });
}

export async function getOpenJobNotificationRecipients(jobPublicId: string) {
  const job = await getPrisma().jobPosting.findUnique({
    where: { publicId: jobPublicId },
    select: {
      publicId: true,
      status: true,
      order: { select: { publicId: true, initialAbsoluteStar: true, progressAbsoluteStar: true, targetAbsoluteStar: true, serviceMode: true } },
    },
  });
  if (!job || job.status !== "OPEN") throw new JobPoolServiceError("Job sudah tidak tersedia untuk dikirim ulang.");
  const recipients = await getEligibleTelegramJokis(job.order.targetAbsoluteStar, job.order.serviceMode);
  return { job, recipients };
}

export async function recordJobNotificationResend(jobPublicId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const job = await tx.jobPosting.findUnique({ where: { publicId: jobPublicId }, select: { orderId: true, status: true } });
    if (!job || job.status !== "OPEN") throw new JobPoolServiceError("Job sudah tidak tersedia untuk dikirim ulang.");
    await tx.adminAuditLog.create({ data: { action: "JOB_NOTIFICATION_RESENT", orderId: job.orderId, metadata: { jobPublicId } } });
  });
}

export async function getOpenJobsForTelegramJoki(telegramUserId: string) {
  const joki = await getPrisma().joki.findUnique({
    where: { telegramUserId },
    select: {
      id: true, publicId: true, status: true, availability: true, peakAbsoluteStar: true, serviceModes: true,
      assignments: { where: { status: "ACTIVE" }, take: 1, select: { id: true } },
    },
  });
  if (!joki) return { joki: null, jobs: [] };
  const hasActiveAssignment = Boolean(joki.assignments[0]);
  if (joki.status !== "ACTIVE" || joki.availability !== "AVAILABLE" || hasActiveAssignment) return { joki, jobs: [] };

  const jobs = await getPrisma().jobPosting.findMany({
    where: {
      status: "OPEN",
      order: { status: "WAITING_JOKI", paymentStatus: "PAID", targetAbsoluteStar: { lte: joki.peakAbsoluteStar }, assignments: { none: { status: "ACTIVE" } } },
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { publicId: true, publishedAt: true, order: { select: { initialAbsoluteStar: true, progressAbsoluteStar: true, targetAbsoluteStar: true, serviceMode: true } } },
  });
  return { joki, jobs: jobs.filter((job) => isJokiEligibleForOrder({ ...joki, targetAbsoluteStar: job.order.targetAbsoluteStar, orderServiceMode: job.order.serviceMode, hasActiveAssignment: false })) };
}

export async function claimJobFromTelegram(telegramUserId: string, jobPublicId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const joki = await tx.joki.findUnique({
      where: { telegramUserId },
      select: { id: true, publicId: true, status: true, availability: true, peakAbsoluteStar: true, serviceModes: true },
    });
    if (!joki) throw new JobClaimError("Joki belum terhubung.");
    const job = await tx.jobPosting.findUnique({ where: { publicId: jobPublicId }, select: { id: true, publicId: true, orderId: true, status: true } });
    if (!job) throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    const order = await tx.order.findUnique({
      where: { id: job.orderId },
      select: { id: true, status: true, paymentStatus: true, progressAbsoluteStar: true, targetAbsoluteStar: true, serviceMode: true },
    });
    if (!order) throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    const [orderAssignment, jokiAssignment] = await Promise.all([
      tx.orderAssignment.findFirst({ where: { orderId: order.id, status: "ACTIVE" }, select: { id: true } }),
      tx.orderAssignment.findFirst({ where: { jokiId: joki.id, status: "ACTIVE" }, select: { id: true } }),
    ]);
    try {
      validateJokiAssignment({
        order: { status: order.status, paymentStatus: order.paymentStatus, targetAbsoluteStar: order.targetAbsoluteStar, serviceMode: order.serviceMode, hasActiveAssignment: Boolean(orderAssignment) },
        joki: { status: joki.status, availability: joki.availability, peakAbsoluteStar: joki.peakAbsoluteStar, serviceModes: joki.serviceModes, hasActiveAssignment: Boolean(jokiAssignment) },
      });
    } catch {
      throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    }

    let claimState: ReturnType<typeof getSuccessfulJobClaimState>;
    try {
      claimState = getSuccessfulJobClaimState(job.status);
    } catch {
      throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    }
    const now = new Date();
    const claimed = await tx.jobPosting.updateMany({
      where: { id: job.id, status: "OPEN" },
      data: { status: claimState.jobStatus, claimedAt: now, claimedByJokiId: joki.id },
    });
    if (claimed.count !== 1) throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    await tx.orderAssignment.create({ data: { orderId: order.id, jokiId: joki.id, status: claimState.assignmentStatus } });
    const jokiUpdate = await tx.joki.updateMany({ where: { id: joki.id, status: "ACTIVE", availability: "AVAILABLE" }, data: { availability: claimState.jokiAvailability } });
    if (jokiUpdate.count !== 1) throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    const orderUpdate = await tx.order.updateMany({ where: { id: order.id, status: "WAITING_JOKI", paymentStatus: "PAID" }, data: { status: claimState.orderStatus } });
    if (orderUpdate.count !== 1) throw new JobClaimError("Job sudah diambil atau tidak lagi tersedia.");
    await Promise.all([
      tx.orderEvent.create({ data: { orderId: order.id, type: "STATUS_CHANGED", status: "ASSIGNED", publicMessage: "Joki telah ditugaskan untuk pesanan ini." } }),
      tx.jokiActivityLog.create({ data: { jokiId: joki.id, orderId: order.id, jobPostingId: job.id, action: "JOB_CLAIMED" } }),
      tx.adminAuditLog.create({ data: { action: "JOB_CLAIMED", orderId: order.id, metadata: { jobPublicId: job.publicId, jokiPublicId: joki.publicId } } }),
    ]);
  }, { isolationLevel: "Serializable" });
}

export async function startTelegramJob(telegramUserId: string, orderPublicId: string): Promise<{ started: boolean }> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const joki = await tx.joki.findUnique({ where: { telegramUserId }, select: { id: true } });
    if (!joki) throw new JobClaimError("Joki belum terhubung.");
    const assignment = await tx.orderAssignment.findFirst({
      where: { jokiId: joki.id, status: "ACTIVE", order: { publicId: orderPublicId } },
      select: { id: true, orderId: true, startedAt: true, order: { select: { status: true, paymentStatus: true, progressAbsoluteStar: true, targetAbsoluteStar: true } } },
    });
    if (!assignment) throw new JobClaimError("Job aktif tidak ditemukan.");
    let startState: ReturnType<typeof getTelegramStartState>;
    try {
      startState = getTelegramStartState(assignment.order.status);
    } catch {
      throw new JobClaimError("Job belum dapat dimulai.");
    }
    if (!startState.started) return { started: false };

    const now = new Date();
    const orderUpdate = await tx.order.updateMany({ where: { id: assignment.orderId, status: "ASSIGNED", paymentStatus: "PAID" }, data: { status: startState.orderStatus } });
    if (orderUpdate.count !== 1) throw new JobClaimError("Job belum dapat dimulai.");
    await tx.orderAssignment.updateMany({ where: { id: assignment.id, status: "ACTIVE", startedAt: null }, data: { startedAt: now } });
    await Promise.all([
      tx.orderEvent.create({ data: { orderId: assignment.orderId, type: "STATUS_CHANGED", status: "IN_PROGRESS", publicMessage: "Pengerjaan pesanan telah dimulai." } }),
      tx.jokiActivityLog.create({ data: { jokiId: joki.id, orderId: assignment.orderId, action: "JOB_STARTED" } }),
    ]);
    return { started: true };
  }, { isolationLevel: "Serializable" });
}
