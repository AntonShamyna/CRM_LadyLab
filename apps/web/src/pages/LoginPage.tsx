import { zodResolver } from '@hookform/resolvers/zod';
import { Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { Button } from '../components/UI';

const schema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { login: 'admin', password: 'admin12345' },
  });

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await api.login(values);
      setSession(session);
      navigate('/dashboard');
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Не удалось войти',
      });
    }
  });

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <Package size={28} />
          <div>
            <h1>Cosmetics CRM</h1>
            <p>Продажи, склад и клиенты</p>
          </div>
        </div>
        <label>
          Логин
          <input {...register('login')} />
          {errors.login && <span className="field-error">{errors.login.message}</span>}
        </label>
        <label>
          Пароль
          <input type="password" {...register('password')} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        {errors.root && <div className="form-error">{errors.root.message}</div>}
        <Button disabled={isSubmitting}>{isSubmitting ? 'Входим...' : 'Войти'}</Button>
      </form>
    </main>
  );
}
