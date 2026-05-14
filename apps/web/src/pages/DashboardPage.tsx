import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Plus } from 'lucide-react';
import { formatBYN, formatDateTime } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { EmptyState, LoadingState, MetricCard, OrderCard, PageHeader, Button } from '../components/UI';

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });

  if (isLoading || !data) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader
        title="Главная"
        subtitle={`Сегодня ${formatDateTime(data.currentDate)}`}
        actions={
          <>
            <Link to="/orders/new">
              <Button>
                <Plus size={16} />
                Заказ
              </Button>
            </Link>
            <Link to="/reminders">
              <Button variant="secondary">
                <Bell size={16} />
                Напоминание
              </Button>
            </Link>
          </>
        }
      />

      <div className="metric-grid">
        <MetricCard label="Выручка за день" value={formatBYN(data.revenueTodayKopecks)} />
        <MetricCard label="Выручка за месяц" value={formatBYN(data.revenueMonthKopecks)} />
        <MetricCard label="Заказы в работе" value={data.queueOrders.length} />
        <MetricCard label="Напоминания сегодня" value={data.reminders.length} />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">Очередь заказов</div>
          <div className="cards-list">
            {data.queueOrders.length ? data.queueOrders.map((order) => <OrderCard key={order.id} order={order} />) : <EmptyState text="Нет заказов в работе" />}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">Напоминания на сегодня</div>
          <div className="reminder-list">
            {data.reminders.length ? (
              data.reminders.map((reminder) => (
                <div className="reminder-row" key={reminder.id}>
                  <strong>{reminder.title}</strong>
                  <span>{formatDateTime(reminder.remindAt)}</span>
                </div>
              ))
            ) : (
              <EmptyState text="На сегодня ничего не запланировано" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
