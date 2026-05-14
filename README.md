# Cosmetics CRM

Рабочий стартовый проект CRM для продажи косметики: заказы, клиенты, продукты, партии, склад, возвраты, напоминания, расходы и аналитика.

## Стек

- Frontend: React, TypeScript, Vite, TanStack Query, Zustand, React Hook Form, Recharts.
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, JWT.
- Shared: общие enum, labels, форматтеры BYN/date и расчетные helpers.

## Локальный запуск

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

По умолчанию seed создает суперадмина:

```text
login: admin
password: admin12345
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

- web через nginx: `http://localhost:8080`
- API напрямую: `http://localhost:4000/api`

Docker-контейнер API при старте выполняет `prisma db push` и idempotent seed суперадмина.

## Важные бизнес-правила

- Новый заказ создается в статусе `ON_ASSEMBLY`.
- Остатки списываются только при переходе `ON_ASSEMBLY -> AWAITING_PAYMENT`.
- Отрицательные остатки разрешены, API возвращает предупреждения.
- При возврате менеджер выбирает `RETURN_TO_STOCK` или `WRITE_OFF`.
- Возврат ставит клиента в черный список.
- В аналитике учитываются `ON_ASSEMBLY`, `AWAITING_PAYMENT`, `CLOSED`.
- `RETURNED` и `CANCELLED` исключаются из выручки и прибыли.
- Продукты в аналитике агрегируются по названию, партии не выделяются отдельной категорией.
