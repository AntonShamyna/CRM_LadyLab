import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBYN } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { LoadingState, MetricCard, PageHeader } from '../components/UI';

export function AnalyticsPage() {
  const now = new Date();
  const [period, setPeriod] = useState('month');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const query = `?${new URLSearchParams({ period, month, year }).toString()}`;
  const summary = useQuery({ queryKey: ['analytics-summary', period, month, year], queryFn: () => api.analyticsSummary(query) });
  const products = useQuery({ queryKey: ['analytics-products', period, month, year], queryFn: () => api.analyticsProducts(query) });

  const chartData = useMemo(
    () => products.data?.slice(0, 8).map((row) => ({ name: row.productName, profit: row.profitKopecks / 100 })) ?? [],
    [products.data],
  );

  if (summary.isLoading || !summary.data || products.isLoading || !products.data) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader title="Аналитика" subtitle="Выручка, прибыль, расходы и товары без выделения партий" />
      <div className="filters">
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="month">Месяц</option>
          <option value="year">Год</option>
        </select>
        {period === 'month' && <input type="number" min={1} max={12} value={month} onChange={(event) => setMonth(event.target.value)} />}
        <input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
      </div>
      <div className="metric-grid">
        <MetricCard label="Выручка товаров" value={formatBYN(summary.data.goodsRevenueKopecks)} />
        <MetricCard label="Доставка" value={formatBYN(summary.data.deliveryRevenueKopecks)} />
        <MetricCard label="Валовая прибыль" value={formatBYN(summary.data.grossProfitKopecks)} />
        <MetricCard label="Чистая прибыль" value={formatBYN(summary.data.netProfitKopecks)} />
        <MetricCard label="Средний чек" value={formatBYN(summary.data.averageCheckKopecks)} />
        <MetricCard label="Возвраты" value={summary.data.returnsCount} tone={summary.data.returnsCount ? 'danger' : undefined} />
        <MetricCard label="Новые клиенты" value={summary.data.newCustomersCount} />
        <MetricCard label="Повторные заказы" value={summary.data.repeatOrdersCount} />
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">Прибыль по товарам</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(value) => formatBYN(Number(value) * 100)} />
                <Bar dataKey="profit" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">Товары</div>
          <div className="entity-list">
            {products.data.map((row) => (
              <div className="entity-row" key={row.productName}>
                <strong>{row.productName}</strong>
                <span>{row.soldQuantity} шт · продажи {formatBYN(row.salesKopecks)} · прибыль {formatBYN(row.profitKopecks)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
