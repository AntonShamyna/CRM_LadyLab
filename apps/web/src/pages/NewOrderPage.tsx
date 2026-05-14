import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatBYN, productUnitLabels } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { Button, LoadingState, PageHeader, WarningList } from '../components/UI';

interface LineDraft {
  productId: string;
  batchId: string;
  quantity: number;
}

const emptyLine = (): LineDraft => ({ productId: '', batchId: '', quantity: 1 });

export function NewOrderPage() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [quickCustomer, setQuickCustomer] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    city: '',
    address: '',
    personalDiscountPercent: 0,
  });
  const [deliveryService, setDeliveryService] = useState('BELPOST');
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [deliveryPriceKopecks, setDeliveryPriceKopecks] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [comment, setComment] = useState('');
  const [items, setItems] = useState<LineDraft[]>([emptyLine()]);

  const customers = useQuery({ queryKey: ['customers', 'order-form'], queryFn: () => api.customers() });
  const products = useQuery({ queryKey: ['products', 'order-form'], queryFn: () => api.products() });
  const createCustomer = useMutation({ mutationFn: api.createCustomer });
  const createOrder = useMutation({ mutationFn: api.createOrder });

  const productById = useMemo(() => new Map(products.data?.items.map((product) => [product.id, product]) ?? []), [products.data]);
  const selectedCustomer = customers.data?.items.find((customer) => customer.id === customerId);

  const lineTotal = (line: LineDraft) => {
    const product = productById.get(line.productId);
    return product ? product.salePriceKopecks * line.quantity : 0;
  };

  const productsTotal = items.reduce((sum, line) => sum + lineTotal(line), 0);
  const discountAmount = Math.round((productsTotal * discountPercent) / 100);
  const totalToPay = productsTotal - discountAmount + deliveryPriceKopecks;

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setItems((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const customer = await createCustomer.mutateAsync(quickCustomer);
      finalCustomerId = customer.id;
    }

    const result = await createOrder.mutateAsync({
      customerId: finalCustomerId,
      deliveryService,
      deliveryPriceKopecks,
      paymentMethod,
      discountPercent,
      comment,
      items: items.filter((line) => line.productId && line.batchId && line.quantity > 0),
    });

    if (result.warnings.length) {
      window.alert('Заказ создан, но есть предупреждения по остаткам.');
    }
    navigate('/orders');
  };

  if (customers.isLoading || products.isLoading) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader title="Новый заказ" subtitle="Клиент, товары, доставка и оплата в одном потоке" />
      <form className="order-form" onSubmit={submit}>
        <div className="form-column">
          <div className="panel">
            <div className="panel-title">1. Клиент</div>
            <label>
              Выбрать из базы
              <select value={customerId} onChange={(event) => {
                const next = event.target.value;
                setCustomerId(next);
                const customer = customers.data?.items.find((item) => item.id === next);
                if (customer) setDiscountPercent(customer.personalDiscountPercent ?? 0);
              }}>
                <option value="">Создать нового клиента</option>
                {customers.data?.items.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.lastName} {customer.firstName} · {customer.phone}
                  </option>
                ))}
              </select>
            </label>
            {!customerId && (
              <div className="form-grid two">
                <input placeholder="Фамилия" required value={quickCustomer.lastName} onChange={(event) => setQuickCustomer({ ...quickCustomer, lastName: event.target.value })} />
                <input placeholder="Имя" required value={quickCustomer.firstName} onChange={(event) => setQuickCustomer({ ...quickCustomer, firstName: event.target.value })} />
                <input placeholder="Телефон" required value={quickCustomer.phone} onChange={(event) => setQuickCustomer({ ...quickCustomer, phone: event.target.value })} />
                <input placeholder="Город" required value={quickCustomer.city} onChange={(event) => setQuickCustomer({ ...quickCustomer, city: event.target.value })} />
                <input className="span-two" placeholder="Адрес" required value={quickCustomer.address} onChange={(event) => setQuickCustomer({ ...quickCustomer, address: event.target.value })} />
              </div>
            )}
            {selectedCustomer?.isBlacklisted && <div className="warning-box">Клиент в черном списке. Проверьте условия оплаты перед отправкой.</div>}
          </div>

          <div className="panel">
            <div className="panel-title">2. Товары</div>
            {items.map((line, index) => {
              const product = productById.get(line.productId);
              return (
                <div className="order-line" key={index}>
                  <select value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value, batchId: '' })} required>
                    <option value="">Продукт</option>
                    {products.data?.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {formatBYN(item.salePriceKopecks)}
                      </option>
                    ))}
                  </select>
                  <select value={line.batchId} onChange={(event) => updateLine(index, { batchId: event.target.value })} required>
                    <option value="">Партия</option>
                    {product?.batches?.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} · остаток {batch.stockQuantity}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
                  <span>{product ? `${product.volume} ${productUnitLabels[product.unit]}` : ' '}</span>
                </div>
              );
            })}
            <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, emptyLine()])}>
              Добавить товар
            </Button>
          </div>
        </div>

        <aside className="order-summary">
          <div className="panel sticky-panel">
            <div className="panel-title">3. Доставка и итог</div>
            <label>
              Доставка
              <select value={deliveryService} onChange={(event) => setDeliveryService(event.target.value)}>
                <option value="BELPOST">Белпочта</option>
                <option value="EUROPOST">Европочта</option>
                <option value="CDEK">СДЭК</option>
                <option value="AUTOLIGHT">Автолайт</option>
                <option value="PICKUP">Самовывоз</option>
              </select>
            </label>
            <label>
              Стоимость доставки, коп.
              <input type="number" min={0} value={deliveryPriceKopecks} onChange={(event) => setDeliveryPriceKopecks(Number(event.target.value))} />
            </label>
            <label>
              Оплата
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="CASH_ON_DELIVERY">Наложенный платеж</option>
                <option value="CASH">Наличный платеж</option>
                <option value="CASHLESS">Безналичный платеж</option>
              </select>
            </label>
            <label>
              Скидка, %
              <input type="number" min={0} max={100} value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} />
            </label>
            <label>
              Комментарий
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <div className="totals">
              <span>Товары <strong>{formatBYN(productsTotal)}</strong></span>
              <span>Скидка <strong>{formatBYN(discountAmount)}</strong></span>
              <span>Доставка <strong>{formatBYN(deliveryPriceKopecks)}</strong></span>
              <span className="grand-total">К оплате <strong>{formatBYN(totalToPay)}</strong></span>
            </div>
            <Button disabled={createOrder.isPending || createCustomer.isPending}>
              {createOrder.isPending ? 'Создаем...' : 'Создать заказ'}
            </Button>
            <WarningList warnings={createOrder.data?.warnings ?? []} />
          </div>
        </aside>
      </form>
    </section>
  );
}
