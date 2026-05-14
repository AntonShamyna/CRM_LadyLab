import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatBYN, formatDate, productUnitLabels } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { Button, EmptyState, LoadingState, PageHeader } from '../components/UI';

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{
    name: string;
    volume: number;
    unit: 'G' | 'ML' | 'KG' | 'PCS';
    salePriceKopecks: number;
    aroma: string;
  }>({
    name: '',
    volume: 50,
    unit: 'ML',
    salePriceKopecks: 0,
    aroma: '',
  });
  const { data, isLoading } = useQuery({ queryKey: ['products', search], queryFn: () => api.products(search ? `?search=${encodeURIComponent(search)}` : '') });
  const create = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      setForm({ name: '', volume: 50, unit: 'ML', salePriceKopecks: 0, aroma: '' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(form);
  };

  return (
    <section className="page">
      <PageHeader title="Продукты" subtitle="Наименования, партии, остатки и прибыль" />
      <div className="split-grid">
        <div className="panel">
          <div className="panel-title">Каталог</div>
          <div className="filters"><input placeholder="Название или аромат" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {isLoading || !data ? <LoadingState /> : data.items.length ? (
            <div className="entity-list">
              {data.items.map((product) => (
                <Link className="entity-row" to={`/products/${product.id}`} key={product.id}>
                  <strong>{product.name}</strong>
                  <span>
                    {product.volume} {productUnitLabels[product.unit]} · остаток {product.totalStock ?? 0} · {formatBYN(product.salePriceKopecks)}
                  </span>
                  <span>Прибыль: {formatBYN(product.profitKopecks ?? 0)}</span>
                </Link>
              ))}
            </div>
          ) : <EmptyState text="Продукты не найдены" />}
        </div>
        <form className="panel compact-form" onSubmit={submit}>
          <div className="panel-title">Создать продукт</div>
          <input placeholder="Название" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="Аромат" value={form.aroma} onChange={(event) => setForm({ ...form, aroma: event.target.value })} />
          <div className="form-grid two">
            <input type="number" min={0} value={form.volume} onChange={(event) => setForm({ ...form, volume: Number(event.target.value) })} />
            <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as typeof form.unit })}>
              <option value="G">г</option>
              <option value="ML">мл</option>
              <option value="KG">кг</option>
              <option value="PCS">шт</option>
            </select>
          </div>
          <input type="number" min={0} placeholder="Цена, коп." value={form.salePriceKopecks} onChange={(event) => setForm({ ...form, salePriceKopecks: Number(event.target.value) })} />
          <Button>Создать продукт</Button>
        </form>
      </div>
    </section>
  );
}

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: ['product', id], queryFn: () => api.product(id) });
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    stockQuantity: 0,
    costPriceKopecks: 0,
    expirationDate: '',
  });
  const createBatch = useMutation({
    mutationFn: () => api.createBatch(id, batchForm),
    onSuccess: () => {
      setBatchForm({ batchNumber: '', stockQuantity: 0, costPriceKopecks: 0, expirationDate: '' });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  if (product.isLoading || !product.data) return <LoadingState />;

  return (
    <section className="page">
      <PageHeader title={product.data.name} subtitle={`${product.data.volume} ${productUnitLabels[product.data.unit]} · ${product.data.aroma ?? 'без аромата'}`} />
      <div className="split-grid">
        <div className="panel">
          <div className="panel-title">Партии</div>
          <div className="entity-list">
            {product.data.batches?.map((batch) => (
              <div className="entity-row" key={batch.id}>
                <strong>Партия {batch.batchNumber}</strong>
                <span>Остаток {batch.stockQuantity} · себестоимость {formatBYN(batch.costPriceKopecks)} · годен до {formatDate(batch.expirationDate)}</span>
              </div>
            ))}
          </div>
        </div>
        <form className="panel compact-form" onSubmit={(event) => { event.preventDefault(); createBatch.mutate(); }}>
          <div className="panel-title">Добавить партию</div>
          <input placeholder="Номер партии" required value={batchForm.batchNumber} onChange={(event) => setBatchForm({ ...batchForm, batchNumber: event.target.value })} />
          <input type="number" placeholder="Остаток" value={batchForm.stockQuantity} onChange={(event) => setBatchForm({ ...batchForm, stockQuantity: Number(event.target.value) })} />
          <input type="number" placeholder="Себестоимость, коп." value={batchForm.costPriceKopecks} onChange={(event) => setBatchForm({ ...batchForm, costPriceKopecks: Number(event.target.value) })} />
          <input type="date" required value={batchForm.expirationDate} onChange={(event) => setBatchForm({ ...batchForm, expirationDate: event.target.value })} />
          <Button>Добавить партию</Button>
        </form>
      </div>
    </section>
  );
}
