import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatBYN } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { Button, EmptyState, LoadingState, MetricCard, PageHeader } from '../components/UI';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lastName: '', firstName: '', phone: '', city: '', address: '' });
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['customers', search], queryFn: () => api.customers(search ? `?search=${encodeURIComponent(search)}` : '') });
  const create = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => {
      setForm({ lastName: '', firstName: '', phone: '', city: '', address: '' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(form);
  };

  return (
    <section className="page">
      <PageHeader title="Клиенты" subtitle="База покупателей, скидки и черный список" />
      <div className="split-grid">
        <div className="panel">
          <div className="panel-title">Список</div>
          <div className="filters"><input placeholder="Имя, фамилия или телефон" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {isLoading || !data ? <LoadingState /> : data.items.length ? (
            <div className="entity-list">
              {data.items.map((customer) => (
                <Link className="entity-row" to={`/customers/${customer.id}`} key={customer.id}>
                  <strong>{customer.lastName} {customer.firstName}</strong>
                  <span>{customer.city} · {customer.ordersCount ?? 0} заказов · {formatBYN(customer.totalOrdersKopecks ?? 0)}</span>
                  {customer.isBlacklisted && <b className="danger-text">Черный список</b>}
                </Link>
              ))}
            </div>
          ) : <EmptyState text="Клиенты не найдены" />}
        </div>
        <form className="panel compact-form" onSubmit={submit}>
          <div className="panel-title">Быстро создать</div>
          <input placeholder="Фамилия" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          <input placeholder="Имя" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <input placeholder="Телефон" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input placeholder="Город" required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <input placeholder="Адрес" required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          <Button>Создать клиента</Button>
        </form>
      </div>
    </section>
  );
}

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const customer = useQuery({ queryKey: ['customer', id], queryFn: () => api.customer(id) });
  const orders = useQuery({ queryKey: ['customer-orders', id], queryFn: () => api.customerOrders(id) });
  const stats = useQuery({ queryKey: ['customer-stats', id], queryFn: () => api.customerStats(id) });

  if (customer.isLoading || !customer.data || stats.isLoading || !stats.data) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader title={`${customer.data.lastName} ${customer.data.firstName}`} subtitle={`${customer.data.phone} · ${customer.data.city}`} />
      <div className="metric-grid">
        <MetricCard label="Заказов" value={stats.data.ordersCount} />
        <MetricCard label="Средний чек" value={formatBYN(stats.data.averageCheckKopecks)} />
        <MetricCard label="Сумма оплат" value={formatBYN(stats.data.totalKopecks)} />
        <MetricCard label="Возвратов" value={stats.data.returnsCount} tone={stats.data.returnsCount ? 'danger' : undefined} />
      </div>
      <div className="panel">
        <div className="panel-title">Заказы клиента</div>
        <div className="entity-list">
          {orders.data?.map((order) => (
            <Link className="entity-row" to={`/orders/${order.id}`} key={order.id}>
              <strong>{formatBYN(order.totalToPayKopecks)}</strong>
              <span>{order.status} · {order.items.length} позиций</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
