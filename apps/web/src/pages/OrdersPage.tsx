import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { formatBYN, formatDateTime } from '@cosmetics-crm/shared';
import { api, Order, StockWarning } from '../lib/api';
import { Button, EmptyState, LoadingState, MetricCard, OrderCard, PageHeader, StatusBadge, WarningList } from '../components/UI';
import { useState } from 'react';

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [warnings, setWarnings] = useState<StockWarning[]>([]);
  const [returnTarget, setReturnTarget] = useState<Order | null>(null);
  const query = `?${new URLSearchParams({ ...(status && { status }), ...(search && { search }) }).toString()}`;
  const { data, isLoading } = useQuery({ queryKey: ['orders', status, search], queryFn: () => api.orders(query) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['orders'] });
  const sendMutation = useMutation({
    mutationFn: (order: Order) => api.sendOrder(order.id),
    onSuccess: (result) => {
      setWarnings(result.warnings);
      invalidate();
    },
  });
  const paidMutation = useMutation({ mutationFn: (order: Order) => api.paidOrder(order.id), onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: (order: Order) => api.cancelOrder(order.id), onSuccess: invalidate });
  const returnMutation = useMutation({
    mutationFn: ({ order, stockAction }: { order: Order; stockAction: 'RETURN_TO_STOCK' | 'WRITE_OFF' }) =>
      api.returnOrder(order.id, { stockAction }),
    onSuccess: () => {
      setReturnTarget(null);
      invalidate();
    },
  });

  return (
    <section className="page">
      <PageHeader
        title="Заказы"
        subtitle="Сборка, оплата, возвраты и отмены"
        actions={
          <Link to="/orders/new">
            <Button>
              <Plus size={16} />
              Новый заказ
            </Button>
          </Link>
        }
      />
      <div className="filters">
        <input placeholder="Поиск по клиенту или телефону" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          <option value="ON_ASSEMBLY">На сборке</option>
          <option value="AWAITING_PAYMENT">Ожидает оплаты</option>
          <option value="CLOSED">Закрытые</option>
          <option value="RETURNED">Возвраты</option>
          <option value="CANCELLED">Отмененные</option>
        </select>
      </div>
      <WarningList warnings={warnings} />
      {isLoading || !data ? (
        <LoadingState />
      ) : data.items.length ? (
        <>
          <div className="desktop-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Статус</th>
                  <th>Клиент</th>
                  <th>Дата</th>
                  <th>Товары</th>
                  <th>К оплате</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id}>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{order.customer.lastName} {order.customer.firstName}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{formatBYN(order.productsTotalAfterDiscountKopecks)}</td>
                    <td>{formatBYN(order.totalToPayKopecks)}</td>
                    <td>
                      <div className="row-actions">
                        {order.status === 'ON_ASSEMBLY' && <Button onClick={() => sendMutation.mutate(order)}>Отправлен</Button>}
                        {order.status === 'AWAITING_PAYMENT' && <Button onClick={() => paidMutation.mutate(order)}>Оплачен</Button>}
                        {order.status === 'AWAITING_PAYMENT' && <Button variant="secondary" onClick={() => setReturnTarget(order)}>Возврат</Button>}
                        {['ON_ASSEMBLY', 'AWAITING_PAYMENT'].includes(order.status) && <Button variant="ghost" onClick={() => cancelMutation.mutate(order)}>Отменить</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {data.items.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSend={(item) => sendMutation.mutate(item)}
                onPaid={(item) => paidMutation.mutate(item)}
                onReturn={setReturnTarget}
                onCancel={(item) => cancelMutation.mutate(item)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState text="Заказы не найдены" />
      )}
      {returnTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="panel-title">Возврат заказа</div>
            <p>
              Клиент будет добавлен в черный список, а заказ исключится из выручки и прибыли. Выберите, что сделать
              с товарами.
            </p>
            <div className="row-actions">
              <Button
                onClick={() => returnMutation.mutate({ order: returnTarget, stockAction: 'RETURN_TO_STOCK' })}
              >
                Вернуть на склад
              </Button>
              <Button
                variant="secondary"
                onClick={() => returnMutation.mutate({ order: returnTarget, stockAction: 'WRITE_OFF' })}
              >
                Списать
              </Button>
              <Button variant="ghost" onClick={() => setReturnTarget(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) });

  if (isLoading || !data) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader
        title={`Заказ ${data.id.slice(0, 8)}`}
        subtitle={`${data.customer.lastName} ${data.customer.firstName} · ${formatDateTime(data.createdAt)}`}
      />
      <div className="metric-grid">
        <MetricCard label="Статус" value={data.status} />
        <MetricCard label="Товары" value={formatBYN(data.productsTotalAfterDiscountKopecks)} />
        <MetricCard label="Доставка" value={formatBYN(data.deliveryPriceKopecks)} />
        <MetricCard label="К оплате" value={formatBYN(data.totalToPayKopecks)} />
      </div>
      <div className="panel">
        <div className="panel-title">Состав заказа</div>
        <div className="entity-list">
          {data.items.map((item) => (
            <div className="entity-row" key={item.id}>
              <strong>{item.productNameSnapshot}</strong>
              <span>
                Партия {item.batchNumberSnapshot} · {item.quantity} шт · {formatBYN(item.lineTotalKopecks)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
