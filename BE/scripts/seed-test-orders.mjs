import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test orders...");

  try {
    const testUser1 = await prisma.user.upsert({
      where: { email: "testuser1@gmail.com" },
      update: {},
      create: {
        email: "testuser1@gmail.com",
        passwordHash: "$2b$10$1234567890123456789012",
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        address: "123 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM",
        status: "ACTIVE",
      },
    });

    const testUser2 = await prisma.user.upsert({
      where: { email: "testuser2@gmail.com" },
      update: {},
      create: {
        email: "testuser2@gmail.com",
        passwordHash: "$2b$10$1234567890123456789012",
        fullName: "Trần Thị B",
        phone: "0987654321",
        address: "456 Lê Lợi, Quận 1, TP.HCM",
        status: "ACTIVE",
      },
    });

    console.log("✓ Test users created");

    const products = await prisma.product.findMany({ take: 3 });

    if (products.length === 0) {
      console.log("❌ No products found.");
      return;
    }

    const now = new Date();
    const deliveredDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Order 1
    const order1 = await prisma.order.create({
      data: {
        userId: testUser1.id,
        totalAmount: 500000,
        discountAmount: 0,
        shippingFee: 50000,
        shippingAddress: "123 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM",
        phoneNumber: "0912345678",
        paymentMethod: "BANK_TRANSFER",
        paymentStatus: "PAID",
        orderStatus: "DELIVERED",
      },
    });

    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order1.id,
          productId: products[0].id,
          quantity: 1,
          priceAtTime: 250000,
        },
        {
          orderId: order1.id,
          productId: products[1].id,
          quantity: 1,
          priceAtTime: 200000,
        },
      ],
    });

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order1.id,
          fromStatus: "PENDING",
          toStatus: "PROCESSING",
          changedBy: 1,
        },
        {
          orderId: order1.id,
          fromStatus: "PROCESSING",
           toStatus: "SHIPPING",
          changedBy: 1,
        },
        {
          orderId: order1.id,
           fromStatus: "SHIPPING",
          toStatus: "DELIVERED",
          changedBy: 1,
          createdAt: deliveredDate,
        },
      ],
    });

    console.log("✓ Order #" + order1.id + " created (500k)");

    // Order 2
    const order2 = await prisma.order.create({
      data: {
        userId: testUser2.id,
        totalAmount: 750000,
        discountAmount: 50000,
        shippingFee: 50000,
        shippingAddress: "456 Lê Lợi, Quận 1, TP.HCM",
        phoneNumber: "0987654321",
        paymentMethod: "VNPAY",
        paymentStatus: "PAID",
        orderStatus: "DELIVERED",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: products[2].id,
        quantity: 2,
        priceAtTime: 400000,
      },
    });

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order2.id,
          fromStatus: "PENDING",
          toStatus: "PROCESSING",
          changedBy: 1,
        },
        {
          orderId: order2.id,
          fromStatus: "PROCESSING",
           toStatus: "SHIPPING",
          changedBy: 1,
        },
        {
          orderId: order2.id,
           fromStatus: "SHIPPING",
          toStatus: "DELIVERED",
          changedBy: 1,
          createdAt: deliveredDate,
        },
      ],
    });

    console.log("✓ Order #" + order2.id + " created (750k)");

    // Order 3
    const order3 = await prisma.order.create({
      data: {
        userId: testUser1.id,
        totalAmount: 350000,
        discountAmount: 0,
        shippingFee: 0,
        shippingAddress: "123 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM",
        phoneNumber: "0912345678",
        paymentMethod: "COD",
        paymentStatus: "PAID",
        orderStatus: "DELIVERED",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        productId: products[0].id,
        quantity: 1,
        priceAtTime: 350000,
      },
    });

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order3.id,
          fromStatus: "PENDING",
          toStatus: "PROCESSING",
          changedBy: 1,
        },
        {
          orderId: order3.id,
          fromStatus: "PROCESSING",
           toStatus: "SHIPPING",
          changedBy: 1,
        },
        {
          orderId: order3.id,
           fromStatus: "SHIPPING",
          toStatus: "DELIVERED",
          changedBy: 1,
          createdAt: deliveredDate,
        },
      ],
    });

    console.log("✓ Order #" + order3.id + " created (350k)");

    console.log("\n✅ Test data seeded!");
    console.log(`
📋 Login Users:
   testuser1@gmail.com
   testuser2@gmail.com

🛒 Orders ready for return:
   Order #${order1.id}: 500k (User 1)
   Order #${order2.id}: 750k (User 2)
   Order #${order3.id}: 350k (User 1)
    `);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
