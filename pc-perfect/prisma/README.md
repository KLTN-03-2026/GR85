# Prisma setup

Project nay da co san Prisma schema va migration ban gui.

## Da duoc copy vao
- `prisma/schema.prisma`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260402210150_init/migration.sql`

## Database hien tai
- Provider: `mysql`
- Env can co: `DATABASE_URL`

## Lenh hay dung
- `npx prisma generate`
- `npx prisma migrate dev`
- `npx prisma db push`
- `npx prisma studio`

## Module co trong schema
- User, Role, Permission
- Product, Category, Supplier, ProductImage, ProductDetail
- Coupon
- Cart, Order, OrderItem
- Warehouse, Batch, SerialNumber
- Review
- ChatRoom, Message
- AiSavedBuild, AiBuildItem
- EmailVerification
