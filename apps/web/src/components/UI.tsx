import clsx from 'clsx';
import type React from 'react';
import { Loader2 } from 'lucide-react';
import { Order, StockWarning } from '../lib/api';
import { formatBYN, formatDateTime, orderStatusLabels } from '@cosmetics-crm/shared';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return (
    <button {...props} className={clsx('button', variant, props.className)}>
      {children}
    </button>
  );
}

export function MetricCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={clsx('metric-card', tone)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBadge({ status }: { status: Order['status'] }) {
  return <span className={clsx('status-badge', status.toLowerCase())}>{orderStatusLabels[status]}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export function LoadingState() {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={18} />
      Загрузка данных
    </div>
  );
}

export function OrderCard({
  order,
  onSend,
  onPaid,
  onReturn,
  onCancel,
}: {
  order: Order;
  onSend?: (order: Order) => void;
  onPaid?: (order: Order) => void;
  onReturn?: (order: Order) => void;
  onCancel?: (order: Order) => void;
}) {
  return (
    <article className="order-card">
      <div className="order-card-main">
        <StatusBadge status={order.status} />
        <strong>
          {order.customer?.lastName} {order.customer?.firstName}
        </strong>
        <span>{formatDateTime(order.createdAt)}</span>
      </div>
      <div className="order-card-meta">
        <span>{order.items?.length ?? 0} поз.</span>
        <span>Товары: {formatBYN(order.productsTotalAfterDiscountKopecks)}</span>
        <span>К оплате: {formatBYN(order.totalToPayKopecks)}</span>
      </div>
      <div className="row-actions">
        {order.status === 'ON_ASSEMBLY' && onSend && <Button onClick={() => onSend(order)}>Отправлен</Button>}
        {order.status === 'AWAITING_PAYMENT' && onPaid && <Button onClick={() => onPaid(order)}>Оплачен</Button>}
        {order.status === 'AWAITING_PAYMENT' && onReturn && (
          <Button variant="secondary" onClick={() => onReturn(order)}>
            Возврат
          </Button>
        )}
        {['ON_ASSEMBLY', 'AWAITING_PAYMENT'].includes(order.status) && onCancel && (
          <Button variant="ghost" onClick={() => onCancel(order)}>
            Отменить
          </Button>
        )}
      </div>
    </article>
  );
}

export function WarningList({ warnings }: { warnings: StockWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="warning-box">
      <strong>Недостаточно остатков, заказ ушел в минус:</strong>
      {warnings.map((warning) => (
        <span key={warning.batchId}>
          Партия {warning.batchNumber}: нужно {warning.requested}, было {warning.available}, дефицит {warning.deficit}
        </span>
      ))}
    </div>
  );
}
