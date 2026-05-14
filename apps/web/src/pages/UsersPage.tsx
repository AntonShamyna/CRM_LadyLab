import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, LoadingState, PageHeader } from '../components/UI';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ login: '', password: '', role: 'MANAGER' });
  const users = useQuery({ queryKey: ['users'], queryFn: api.users });
  const create = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      setForm({ login: '', password: '', role: 'MANAGER' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(form);
  };

  return (
    <section className="page">
      <PageHeader title="Пользователи" subtitle="Менеджеров создает только суперадмин" />
      <div className="split-grid">
        <div className="panel">
          <div className="panel-title">Команда</div>
          {users.isLoading || !users.data ? <LoadingState /> : (
            <div className="entity-list">
              {users.data.map((user) => (
                <div className="entity-row" key={user.id}>
                  <strong>{user.login}</strong>
                  <span>{user.role} · {user.isActive ? 'активен' : 'выключен'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <form className="panel compact-form" onSubmit={submit}>
          <div className="panel-title">Создать пользователя</div>
          <input placeholder="Логин" required value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} />
          <input type="password" placeholder="Пароль" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="MANAGER">Менеджер</option>
            <option value="SUPER_ADMIN">Суперадмин</option>
          </select>
          <Button>Создать</Button>
        </form>
      </div>
    </section>
  );
}
