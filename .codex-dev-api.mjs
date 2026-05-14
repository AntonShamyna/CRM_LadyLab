import http from 'node:http';
import { URL } from 'node:url';

const now = () => new Date().toISOString();
const user = { id: 'user-admin', login: 'admin', role: 'SUPER_ADMIN', isActive: true };

let users = [user];
let customers = [
  {
    id: 'cust-1',
    firstName: 'Anna',
    lastName: 'Ivanova',
    phone: '+375291112233',
    city: 'Minsk',
    address: 'Nezavisimosti 1',
    personalDiscountPercent: 5,
    isRegular: true,
    isBlacklisted: false,
    ordersCount: 1,
    totalOrdersKopecks: 8200,
    createdAt: now(),
  },
];

let products = [
  {
    id: 'prod-1',
    name: 'Face Cream',
    volume: 50,
    unit: 'ML',
    salePriceKopecks: 4200,
    aroma: 'Rose',
    totalStock: 24,
    profitKopecks: 1700,
    createdAt: now(),
    batches: [
      {
        id: 'batch-1',
        productId: 'prod-1',
        batchNumber: 'A-001',
        stockQuantity: 24,
        costPriceKopecks: 2500,
        expirationDate: '2027-12-31T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Body Scrub',
    volume: 200,
    unit: 'G',
    salePriceKopecks: 5800,
    aroma: 'Citrus',
    totalStock: 12,
    profitKopecks: 2300,
    createdAt: now(),
    batches: [
      {
        id: 'batch-2',
        productId: 'prod-2',
        batchNumber: 'B-104',
        stockQuantity: 12,
        costPriceKopecks: 3500,
        expirationDate: '2027-06-30T00:00:00.000Z',
      },
    ],
  },
];

let orders = [
  {
    id: 'order-1',
    status: 'ON_ASSEMBLY',
    customer: customers[0],
    items: [
      {
        id: 'item-1',
        productNameSnapshot: 'Face Cream',
        batchNumberSnapshot: 'A-001',
        quantity: 2,
        salePriceSnapshotKopecks: 4200,
        costPriceSnapshotKopecks: 2500,
        lineTotalKopecks: 8400,
      },
    ],
    deliveryService: 'BELPOST',
    deliveryPriceKopecks: 400,
    paymentMethod: 'CASH_ON_DELIVERY',
    discountPercent: 5,
    productsTotalAfterDiscountKopecks: 7980,
    totalToPayKopecks: 8380,
    createdAt: now(),
  },
];

let reminders = [
  {
    id: 'rem-1',
    title: 'Call customer',
    description: 'Confirm delivery details',
    remindAt: now(),
    status: 'ACTIVE',
    customer: customers[0],
  },
];

const json = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  response.end(JSON.stringify(body));
};

const list = (items, url) => {
  const search = url.searchParams.get('search')?.toLowerCase();
  const status = url.searchParams.get('status');
  let filtered = [...items];
  if (status) filtered = filtered.filter((item) => item.status === status);
  if (search) {
    filtered = filtered.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
  }
  return { items: filtered, total: filtered.length, page: 1, pageSize: 50 };
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const makeOrder = (body) => {
  const customer = customers.find((item) => item.id === body.customerId);
  const items = body.items.map((line, index) => {
    const product = products.find((item) => item.id === line.productId);
    const batch = product?.batches?.find((item) => item.id === line.batchId);
    return {
      id: `item-${Date.now()}-${index}`,
      productNameSnapshot: product?.name ?? 'Product',
      batchNumberSnapshot: batch?.batchNumber ?? 'Batch',
      quantity: line.quantity,
      salePriceSnapshotKopecks: product?.salePriceKopecks ?? 0,
      costPriceSnapshotKopecks: batch?.costPriceKopecks ?? 0,
      lineTotalKopecks: (product?.salePriceKopecks ?? 0) * line.quantity,
    };
  });
  const productsTotal = items.reduce((sum, item) => sum + item.lineTotalKopecks, 0);
  const discountAmount = Math.round((productsTotal * (body.discountPercent ?? 0)) / 100);
  const productsTotalAfterDiscountKopecks = productsTotal - discountAmount;
  return {
    id: `order-${Date.now()}`,
    status: 'ON_ASSEMBLY',
    customer,
    items,
    deliveryService: body.deliveryService,
    deliveryPriceKopecks: body.deliveryPriceKopecks ?? 0,
    paymentMethod: body.paymentMethod,
    discountPercent: body.discountPercent ?? 0,
    productsTotalAfterDiscountKopecks,
    totalToPayKopecks: productsTotalAfterDiscountKopecks + (body.deliveryPriceKopecks ?? 0),
    createdAt: now(),
  };
};

const setOrderStatus = (id, status) => {
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  order.status = status;
  if (status === 'AWAITING_PAYMENT') order.sentAt = now();
  if (status === 'CLOSED') order.paidAt = now();
  if (status === 'RETURNED') order.returnedAt = now();
  return order;
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost:4000');
  const path = url.pathname.replace(/^\/api/, '') || '/';

  if (request.method === 'OPTIONS') return json(response, 204, {});

  try {
    if (request.method === 'POST' && path === '/auth/login') {
      const body = await readBody(request);
      if (body.login === 'admin' && body.password === 'admin12345') {
        return json(response, 200, { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token', user });
      }
      return json(response, 401, { message: 'Invalid login or password' });
    }
    if (request.method === 'POST' && path === '/auth/refresh') {
      return json(response, 200, { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
    }
    if (request.method === 'POST' && path === '/auth/logout') return json(response, 200, {});
    if (request.method === 'GET' && path === '/auth/me') return json(response, 200, user);

    if (request.method === 'GET' && path === '/dashboard') {
      const queueOrders = orders.filter((item) => ['ON_ASSEMBLY', 'AWAITING_PAYMENT'].includes(item.status));
      return json(response, 200, {
        currentDate: now(),
        revenueTodayKopecks: 8380,
        revenueMonthKopecks: orders.reduce((sum, item) => sum + item.totalToPayKopecks, 0),
        queueOrders,
        reminders,
      });
    }

    if (request.method === 'GET' && path === '/customers') return json(response, 200, list(customers, url));
    if (request.method === 'POST' && path === '/customers') {
      const body = await readBody(request);
      const customer = {
        id: `cust-${Date.now()}`,
        personalDiscountPercent: 0,
        isRegular: false,
        isBlacklisted: false,
        ordersCount: 0,
        totalOrdersKopecks: 0,
        createdAt: now(),
        ...body,
      };
      customers.push(customer);
      return json(response, 201, customer);
    }
    if (request.method === 'GET' && /^\/customers\/[^/]+$/.test(path)) {
      return json(response, 200, customers.find((item) => item.id === path.split('/')[2]));
    }
    if (request.method === 'GET' && /^\/customers\/[^/]+\/orders$/.test(path)) {
      const id = path.split('/')[2];
      return json(response, 200, orders.filter((item) => item.customer.id === id));
    }
    if (request.method === 'GET' && /^\/customers\/[^/]+\/statistics$/.test(path)) {
      const id = path.split('/')[2];
      const customerOrders = orders.filter((item) => item.customer.id === id);
      const total = customerOrders.reduce((sum, item) => sum + item.totalToPayKopecks, 0);
      return json(response, 200, {
        ordersCount: customerOrders.length,
        averageCheckKopecks: customerOrders.length ? Math.round(total / customerOrders.length) : 0,
        totalKopecks: total,
        returnsCount: customerOrders.filter((item) => item.status === 'RETURNED').length,
      });
    }

    if (request.method === 'GET' && path === '/products') return json(response, 200, list(products, url));
    if (request.method === 'POST' && path === '/products') {
      const body = await readBody(request);
      const product = { id: `prod-${Date.now()}`, totalStock: 0, profitKopecks: 0, batches: [], createdAt: now(), ...body };
      products.push(product);
      return json(response, 201, product);
    }
    if (request.method === 'GET' && /^\/products\/[^/]+$/.test(path)) {
      return json(response, 200, products.find((item) => item.id === path.split('/')[2]));
    }
    if (request.method === 'GET' && /^\/products\/[^/]+\/batches$/.test(path)) {
      const product = products.find((item) => item.id === path.split('/')[2]);
      return json(response, 200, product?.batches ?? []);
    }
    if (request.method === 'POST' && /^\/products\/[^/]+\/batches$/.test(path)) {
      const product = products.find((item) => item.id === path.split('/')[2]);
      const body = await readBody(request);
      const batch = { id: `batch-${Date.now()}`, productId: product.id, ...body };
      product.batches.push(batch);
      product.totalStock = product.batches.reduce((sum, item) => sum + Number(item.stockQuantity ?? 0), 0);
      return json(response, 201, batch);
    }

    if (request.method === 'GET' && path === '/orders') return json(response, 200, list(orders, url));
    if (request.method === 'POST' && path === '/orders') {
      const order = makeOrder(await readBody(request));
      orders.unshift(order);
      return json(response, 201, { order, warnings: [] });
    }
    if (request.method === 'GET' && /^\/orders\/[^/]+$/.test(path)) {
      return json(response, 200, orders.find((item) => item.id === path.split('/')[2]));
    }
    if (request.method === 'POST' && /^\/orders\/[^/]+\/send$/.test(path)) {
      return json(response, 200, { order: setOrderStatus(path.split('/')[2], 'AWAITING_PAYMENT'), warnings: [] });
    }
    if (request.method === 'POST' && /^\/orders\/[^/]+\/paid$/.test(path)) return json(response, 200, setOrderStatus(path.split('/')[2], 'CLOSED'));
    if (request.method === 'POST' && /^\/orders\/[^/]+\/return$/.test(path)) return json(response, 200, setOrderStatus(path.split('/')[2], 'RETURNED'));
    if (request.method === 'POST' && /^\/orders\/[^/]+\/cancel$/.test(path)) return json(response, 200, setOrderStatus(path.split('/')[2], 'CANCELLED'));

    if (request.method === 'GET' && path === '/reminders') return json(response, 200, list(reminders, url));
    if (request.method === 'POST' && path === '/reminders') {
      const reminder = { id: `rem-${Date.now()}`, status: 'ACTIVE', ...(await readBody(request)) };
      reminders.unshift(reminder);
      return json(response, 201, reminder);
    }

    if (request.method === 'GET' && path === '/analytics/summary') {
      const goodsRevenueKopecks = orders.reduce((sum, item) => sum + item.productsTotalAfterDiscountKopecks, 0);
      const deliveryRevenueKopecks = orders.reduce((sum, item) => sum + item.deliveryPriceKopecks, 0);
      return json(response, 200, {
        ordersCount: orders.length,
        returnsCount: orders.filter((item) => item.status === 'RETURNED').length,
        goodsRevenueKopecks,
        deliveryRevenueKopecks,
        totalToPayKopecks: goodsRevenueKopecks + deliveryRevenueKopecks,
        costKopecks: 5000,
        grossProfitKopecks: goodsRevenueKopecks - 5000,
        expensesKopecks: 1200,
        netProfitKopecks: goodsRevenueKopecks - 6200,
        averageCheckKopecks: orders.length ? Math.round(goodsRevenueKopecks / orders.length) : 0,
        newCustomersCount: customers.length,
        repeatOrdersCount: Math.max(0, orders.length - customers.length),
      });
    }
    if (request.method === 'GET' && path === '/analytics/products') {
      return json(response, 200, products.map((product) => ({
        productName: product.name,
        soldQuantity: 2,
        salesKopecks: product.salePriceKopecks * 2,
        costKopecks: product.batches?.[0]?.costPriceKopecks * 2 || 0,
        profitKopecks: product.profitKopecks,
        ordersCount: 1,
      })));
    }

    if (request.method === 'GET' && path === '/users') return json(response, 200, users);
    if (request.method === 'POST' && path === '/users') {
      const body = await readBody(request);
      const created = { id: `user-${Date.now()}`, login: body.login, role: body.role, isActive: true };
      users.push(created);
      return json(response, 201, created);
    }

    return json(response, 404, { message: `No dev API route for ${request.method} ${path}` });
  } catch (error) {
    return json(response, 500, { message: error.message });
  }
});

server.listen(4000, '0.0.0.0', () => {
  console.log('Dev API listening on http://127.0.0.1:4000/api');
});
