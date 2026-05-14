import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@cosmetics-crm/shared';
import { api } from '../lib/api';
import { Button, EmptyState, LoadingState, PageHeader } from '../components/UI';

export function RemindersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', remindAt: '' });
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: () => api.reminders() });
  const create = useMutation({
    mutationFn: api.createReminder,
    onSuccess: () => {
      setForm({ title: '', description: '', remindAt: '' });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ ...form, remindAt: new Date(form.remindAt).toISOString() });
  };

  return (
    <section className="page">
      <PageHeader title="Напоминания" subtitle="События менеджера и задачи на дату" />
      <div className="split-grid">
        <div className="panel">
          <div className="panel-title">Список</div>
          {reminders.isLoading || !reminders.data ? <LoadingState /> : reminders.data.items.length ? (
            <div className="entity-list">
              {reminders.data.items.map((reminder) => (
                <div className="entity-row" key={reminder.id}>
                  <strong>{reminder.title}</strong>
                  <span>{formatDateTime(reminder.remindAt)} · {reminder.status}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState text="Напоминаний пока нет" />}
        </div>
        <form className="panel compact-form" onSubmit={submit}>
          <div className="panel-title">Создать</div>
          <input placeholder="Заголовок" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea placeholder="Описание" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <input type="datetime-local" required value={form.remindAt} onChange={(event) => setForm({ ...form, remindAt: event.target.value })} />
          <Button>Создать напоминание</Button>
        </form>
      </div>
    </section>
  );
}
