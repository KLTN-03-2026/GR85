import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { startOfDay, endOfDay, subDays, format, differenceInDays } from "date-fns";

export async function getAdminReports(filters = {}) {
  const { startDate, endDate } = filters;

  const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
  const end = endDate ? new Date(endDate) : new Date();

  const startIso = startOfDay(start);
  const endIso = endOfDay(end);

  const dateFilter = {
    createdAt: {
      gte: startIso,
      lte: endIso,
    },
  };

  // 1. Báo cáo bán hàng
  const orders = await prisma.order.findMany({
    where: dateFilter,
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  let totalRevenue = 0;
  let successOrders = 0;
  let cancelledOrders = 0;

  orders.forEach((order) => {
    if (["PROCESSING", "SHIPPING", "DELIVERED"].includes(order.orderStatus)) {
      totalRevenue += Number(order.totalAmount);
      successOrders++;
    } else if (order.orderStatus === "CANCELLED" || order.orderStatus === "RETURNED") {
      cancelledOrders++;
    }
  });

  const totalOrders = orders.length;
  const averageOrderValue = successOrders > 0 ? totalRevenue / successOrders : 0;

  // 2. Báo cáo sản phẩm (Top bán chạy) & 3. Báo cáo danh mục
  const productSales = {};
  const categorySales = {};

  orders.forEach((order) => {
    if (!["PROCESSING", "SHIPPING", "DELIVERED"].includes(order.orderStatus)) return;

    order.orderItems.forEach((item) => {
      const productId = item.productId;
      const categoryName = item.product?.category?.name || "Khác";

      if (!productSales[productId]) {
        productSales[productId] = {
          id: productId,
          name: item.product?.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += Number(item.price) * item.quantity;

      if (!categorySales[categoryName]) {
        categorySales[categoryName] = 0;
      }
      categorySales[categoryName] += Number(item.price) * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const categoryChartData = Object.entries(categorySales).map(([name, value]) => ({
    name,
    value,
  }));

  // Tồn kho
  const productsStock = await prisma.product.findMany({
    select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true },
  });

  const highStockProducts = [...productsStock]
    .sort((a, b) => Number(b.stockQuantity) - Number(a.stockQuantity))
    .slice(0, 10);
  
  const lowStockProducts = productsStock
    .filter((p) => Number(p.stockQuantity) <= Number(p.lowStockThreshold || 5))
    .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity))
    .slice(0, 10);

  // 4. Báo cáo khách hàng VIP
  const customerSpending = {};
  orders.forEach((order) => {
    if (!["PROCESSING", "SHIPPING", "DELIVERED"].includes(order.orderStatus)) return;
    if (!order.userId) return;

    if (!customerSpending[order.userId]) {
      customerSpending[order.userId] = {
        userId: order.userId,
        totalSpent: 0,
        orderCount: 0,
      };
    }
    customerSpending[order.userId].totalSpent += Number(order.totalAmount);
    customerSpending[order.userId].orderCount += 1;
  });

  const topCustomerIds = Object.keys(customerSpending)
    .map(Number)
    .sort((a, b) => customerSpending[b].totalSpent - customerSpending[a].totalSpent)
    .slice(0, 10);

  const topCustomersData = await prisma.user.findMany({
    where: { id: { in: topCustomerIds } },
    select: { id: true, fullName: true, email: true },
  });

  const topCustomers = topCustomersData.map((user) => ({
    ...user,
    totalSpent: customerSpending[user.id].totalSpent,
    orderCount: customerSpending[user.id].orderCount,
  })).sort((a, b) => b.totalSpent - a.totalSpent);

  // 5. Báo cáo nhập hàng
  const batches = await prisma.batch.findMany({
    where: dateFilter,
    include: { supplier: true },
  });

  let totalImportCost = 0;
  const supplierImports = {};

  batches.forEach((batch) => {
    totalImportCost += Number(batch.totalCost || 0);
    const supplierName = batch.supplier?.name || "Khác";
    if (!supplierImports[supplierName]) {
      supplierImports[supplierName] = 0;
    }
    supplierImports[supplierName] += Number(batch.totalCost || 0);
  });

  const topSuppliers = Object.entries(supplierImports)
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // 6. Báo cáo lợi nhuận
  const totalProfit = totalRevenue - totalImportCost;

  // 7. Biểu đồ doanh thu (Trend)
  const isDaily = differenceInDays(endIso, startIso) <= 60;
  const revenueChartMap = {};

  orders.forEach((order) => {
    if (!["PROCESSING", "SHIPPING", "DELIVERED"].includes(order.orderStatus)) return;
    const dateKey = isDaily
      ? format(order.createdAt, "dd/MM/yyyy")
      : format(order.createdAt, "MM/yyyy");

    if (!revenueChartMap[dateKey]) {
      revenueChartMap[dateKey] = { date: dateKey, revenue: 0, profit: 0 };
    }
    revenueChartMap[dateKey].revenue += Number(order.totalAmount);
  });

  // Gộp chi phí nhập vào biểu đồ lợi nhuận
  batches.forEach((batch) => {
    const dateKey = isDaily
      ? format(batch.createdAt, "dd/MM/yyyy")
      : format(batch.createdAt, "MM/yyyy");

    if (!revenueChartMap[dateKey]) {
      revenueChartMap[dateKey] = { date: dateKey, revenue: 0, profit: 0 };
    }
    // Lợi nhuận = Doanh thu - Chi phí nhập trong ngày đó (đơn giản hóa)
    revenueChartMap[dateKey].profit -= Number(batch.totalCost || 0);
  });

  // Tính lợi nhuận ròng trên biểu đồ
  Object.values(revenueChartMap).forEach((item) => {
    item.profit += item.revenue; // Profit = Revenue - Cost (Cost already subtracted above)
  });

  // Sắp xếp biểu đồ theo thời gian
  const revenueChartData = Object.values(revenueChartMap).sort((a, b) => {
    // Basic sorting, works better with ISO dates but good enough for display
    const [d1, m1, y1] = a.date.split("/");
    const [d2, m2, y2] = b.date.split("/");
    if (y1 !== y2) return y1 - y2;
    if (m1 !== m2) return m1 - m2;
    return (d1 || 0) - (d2 || 0);
  });

  return serializeData({
    sales: {
      totalRevenue,
      totalOrders,
      successOrders,
      cancelledOrders,
      averageOrderValue,
    },
    products: {
      topSelling: topProducts,
      highStock: highStockProducts,
      lowStock: lowStockProducts,
    },
    categories: {
      revenue: categoryChartData,
    },
    customers: {
      topVIP: topCustomers,
    },
    imports: {
      totalCost: totalImportCost,
      importCount: batches.length,
      topSuppliers,
    },
    profit: {
      totalProfit,
    },
    charts: {
      revenueTrend: revenueChartData,
    },
  });
}
