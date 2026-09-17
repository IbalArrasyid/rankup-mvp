import { Prisma } from "@/generated/prisma/client";
import { BUSINESS } from "@/config/business";
import { generatePublicOrderId } from "@/domain/order-id";
import { calculateOrderPrice, requiresCredentials } from "@/domain/service-mode";
import { encryptCredentialValue } from "@/lib/credentials";
import { getPrisma } from "@/lib/prisma";
import type { CredentialInput, OrderCreationInput } from "@/validation/orders";

export async function createOrder(input: OrderCreationInput, whatsapp: string) {
  const quote = calculateOrderPrice(input.serviceMode, input.currentStar, input.targetStar);
  const prisma = getPrisma();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = generatePublicOrderId();
    try {
      return await prisma.order.create({
        data: {
          publicId,
          customerName: input.customerName,
          whatsapp,
          email: input.email || null,
          customerNotes: input.customerNotes || null,
          serviceMode: input.serviceMode,
          mlbbNickname: input.serviceMode === "GENDONG" ? input.mlbbNickname || null : null,
          mlbbUserId: input.serviceMode === "GENDONG" ? input.mlbbUserId || null : null,
          mlbbServerId: input.serviceMode === "GENDONG" ? input.mlbbServerId || null : null,
          initialAbsoluteStar: input.currentStar,
          targetAbsoluteStar: input.targetStar,
          progressAbsoluteStar: input.currentStar,
          totalStars: quote.totalStars,
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
          currency: BUSINESS.currency,
          events: {
            create: {
              type: "ORDER_CREATED",
              status: "AWAITING_PAYMENT",
              publicMessage: input.serviceMode === "GENDONG" ? "Pesanan Mode Gendong dibuat dan menunggu pembayaran." : "Pesanan dibuat dan menunggu pembayaran.",
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }

  throw new Error("Nomor pesanan tidak dapat dibuat. Silakan coba lagi.");
}

export async function findOrderForTracking(publicId: string, whatsapp: string) {
  return getPrisma().order.findFirst({
    where: { publicId, whatsapp },
    select: { publicId: true },
  });
}

export async function getCustomerOrder(publicId: string) {
  return getPrisma().order.findUnique({
    where: { publicId },
    include: {
      credentials: { select: { id: true, createdAt: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function saveCredential(orderPublicId: string, input: CredentialInput) {
  const identifier = encryptCredentialValue(input.identifier);
  const secret = encryptCredentialValue(input.secret);
  const accountId = encryptCredentialValue(input.accountId);
  const serverId = encryptCredentialValue(input.serverId);
  const notes = input.notes ? encryptCredentialValue(input.notes) : null;
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({ where: { publicId: orderPublicId }, select: { id: true, serviceMode: true } });
  if (!order) return null;
  if (!requiresCredentials(order.serviceMode)) throw new Error("Data login tidak diperlukan untuk Mode Gendong.");

  return prisma.$transaction([
    prisma.orderCredential.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        loginMethod: input.loginMethod,
        identifierCiphertext: identifier.ciphertext,
        identifierIv: identifier.iv,
        identifierAuthTag: identifier.authTag,
        secretCiphertext: secret.ciphertext,
        secretIv: secret.iv,
        secretAuthTag: secret.authTag,
        accountIdCiphertext: accountId.ciphertext,
        accountIdIv: accountId.iv,
        accountIdAuthTag: accountId.authTag,
        serverIdCiphertext: serverId.ciphertext,
        serverIdIv: serverId.iv,
        serverIdAuthTag: serverId.authTag,
        notesCiphertext: notes?.ciphertext,
        notesIv: notes?.iv,
        notesAuthTag: notes?.authTag,
      },
      update: {
        loginMethod: input.loginMethod,
        identifierCiphertext: identifier.ciphertext,
        identifierIv: identifier.iv,
        identifierAuthTag: identifier.authTag,
        secretCiphertext: secret.ciphertext,
        secretIv: secret.iv,
        secretAuthTag: secret.authTag,
        accountIdCiphertext: accountId.ciphertext,
        accountIdIv: accountId.iv,
        accountIdAuthTag: accountId.authTag,
        serverIdCiphertext: serverId.ciphertext,
        serverIdIv: serverId.iv,
        serverIdAuthTag: serverId.authTag,
        notesCiphertext: notes?.ciphertext ?? null,
        notesIv: notes?.iv ?? null,
        notesAuthTag: notes?.authTag ?? null,
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: "CREDENTIALS_RECEIVED",
        publicMessage: "Data login diterima secara aman.",
      },
    }),
  ]);
}
