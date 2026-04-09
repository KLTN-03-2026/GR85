import { Link } from 'react-router-dom';
import {
  Activity,
  BadgePercent,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cpu,
  CreditCard,
  LayoutDashboard,
  MailCheck,
  MessageSquareMore,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  Warehouse,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  adminSummaryCards,
  aiBuilds,
  categories,
  chats,
  coupons,
  emailVerifications,
  orderStatusData,
  orders,
  payments,
  products,
  reviews,
  roles,
  revenueTrend,
  suppliers,
  topProducts,
  users,
  warehouses,
} from '@/client/features/admin/data/admin-mock-data';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'catalog', label: 'Danh mục & NCC', icon: Building2 },
  { id: 'coupons', label: 'Mã giảm giá', icon: BadgePercent },
  { id: 'orders', label: 'Đơn hàng', icon: ClipboardList },
  { id: 'payments', label: 'Thanh toán', icon: CreditCard },
  { id: 'warehouse', label: 'Kho', icon: Warehouse },
  { id: 'reviews', label: 'Đánh giá', icon: Star },
  { id: 'chat', label: 'Chat', icon: MessageSquareMore },
  { id: 'ai-build', label: 'AI Build', icon: Sparkles },
  { id: 'verification', label: 'Email OTP', icon: MailCheck },
  { id: 'roles', label: 'Phân quyền', icon: ShieldCheck },
] as const;

const summaryToneMap = {
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
  blue: 'from-sky-500/20 to-sky-500/5 border-sky-500/20',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
  rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20',
} as const;

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(240,253,250,1)_100%)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 pb-10 pt-24 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4 rounded-3xl border border-border/60 bg-white/85 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-white to-accent/10 p-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-[0_10px_30px_hsl(var(--primary)/0.35)]">
                <Store className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">Admin Control Center</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Giao diện quản trị tổng hợp cho hệ thống bán PC, kho, chat và AI build.
              </p>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-secondary hover:text-primary"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </a>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-border/60 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Trang chủ quản lý</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Bảng điều khiển quản trị cho mô hình PC Perfect kiểu Shopee/Lazada
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Các khối dưới đây được chia theo module đúng theo schema bạn mô tả, để sau này nối API và Prisma vào rất thẳng tay.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/login">
                  <Button variant="hero" size="lg" className="w-full">Đăng nhập quản trị</Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg" className="w-full">Tạo tài khoản staff</Button>
                </Link>
              </div>
            </div>
          </section>

          <section id="dashboard" className="space-y-6">
            <SectionHeader
              icon={LayoutDashboard}
              title="Dashboard"
              description="Tổng quan số liệu từ User, Order, OrderItem và Product"
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {adminSummaryCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${summaryToneMap[card.tone]}`}
                >
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold">{card.value}</div>
                      <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>
                    </div>
                    <Badge className="bg-white/80 text-slate-700">{card.change}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel title="Doanh thu theo tháng" description="Đơn vị: triệu đồng">
                <ChartContainer
                  className="h-[320px] w-full"
                  config={{ revenue: { label: 'Doanh thu', color: '#10b981' }, orders: { label: 'Đơn hàng', color: '#0f172a' } }}
                >
                  <LineChart data={revenueTrend} margin={{ left: 12, right: 12, top: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} strokeDasharray="6 6" dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </Panel>

              <Panel title="Trạng thái đơn hàng" description="Phân bố realtime">
                <ChartContainer className="h-[320px] w-full" config={{}}>
                  <PieChart>
                    <Pie data={orderStatusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={4}>
                      {orderStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-3">
                  {orderStatusData.map((item) => (
                    <div key={item.name} className="rounded-2xl bg-secondary/70 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Sản phẩm bán chạy" description="Dựa trên OrderItem và tồn kho hiện tại">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {topProducts.map((product) => (
                  <div key={product.name} className="rounded-3xl border border-border/60 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary">Top seller</Badge>
                    </div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between"><span>Đã bán</span><span className="font-medium text-foreground">{product.sold}</span></div>
                      <div className="flex items-center justify-between"><span>Tồn kho</span><span className="font-medium text-foreground">{product.stock}</span></div>
                      <div className="flex items-center justify-between"><span>Doanh thu</span><span className="font-medium text-foreground">{product.revenue}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section id="users" className="space-y-6">
            <SectionHeader icon={Users} title="Quản lý người dùng" description="User, Role, Permission và trạng thái tài khoản" />
            <Panel title="Danh sách user" description="Tìm kiếm theo email hoặc tên, ban/unban, chỉnh role">
              <DataTable
                columns={['Tên', 'Email', 'Role', 'Trạng thái', 'Đơn hàng', 'Chi tiêu']}
                rows={users.map((user) => [user.name, user.email, pill(user.role), statusBadge(user.status), user.orders.toString(), user.spend])}
              />
            </Panel>
          </section>

          <section id="products" className="space-y-6">
            <SectionHeader icon={Package} title="Quản lý sản phẩm" description="CRUD, tồn kho, nhiều ảnh, specs và status" />
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Panel title="Kho sản phẩm" description="Có thể nối Product, ProductImage, ProductDetail sau">
                <DataTable
                  columns={['SKU', 'Tên sản phẩm', 'Danh mục', 'Giá', 'Tồn kho', 'Status']}
                  rows={products.map((product) => [product.sku, product.name, product.category, product.price, product.stock.toString(), statusBadge(product.status)])}
                />
              </Panel>
              <Panel title="Checklist UI/API" description="Các hành động cần có cho admin">
                <Checklist
                  items={[
                    'Thêm mới / cập nhật / xóa sản phẩm',
                    'Upload nhiều ảnh sản phẩm',
                    'Bật tắt trạng thái hiển thị',
                    'Quản lý tồn kho và cảnh báo sắp hết',
                    'Nhập thông số kỹ thuật chi tiết',
                  ]}
                />
              </Panel>
            </div>
          </section>

          <section id="catalog" className="space-y-6">
            <SectionHeader icon={Building2} title="Danh mục và nhà cung cấp" description="Category CRUD, slug tự động và Supplier management" />
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Danh mục" description="Slug sinh tự động từ tên">
                <DataTable
                  columns={['Tên', 'Slug', 'Sản phẩm']}
                  rows={categories.map((category) => [category.name, category.slug, category.products.toString()])}
                />
              </Panel>
              <Panel title="Nhà cung cấp" description="Thông tin liên hệ và trạng thái kết nối">
                <DataTable
                  columns={['Tên', 'Email', 'Điện thoại', 'Trạng thái']}
                  rows={suppliers.map((supplier) => [supplier.name, supplier.contact, supplier.phone, statusBadge(supplier.status)])}
                />
              </Panel>
            </div>
          </section>

          <section id="coupons" className="space-y-6">
            <SectionHeader icon={BadgePercent} title="Quản lý mã giảm giá" description="Coupon theo % hoặc số tiền, giới hạn lượt dùng và lịch áp dụng" />
            <Panel title="Coupon center" description="Có thể nối với DiscountType và usage limit">
              <DataTable
                columns={['Code', 'Loại', 'Giá trị', 'Đã dùng', 'Thời gian', 'Status']}
                rows={coupons.map((coupon) => [coupon.code, coupon.type, coupon.value, coupon.used, coupon.schedule, statusBadge(coupon.status)])}
              />
            </Panel>
          </section>

          <section id="orders" className="space-y-6">
            <SectionHeader icon={ClipboardList} title="Quản lý đơn hàng" description="Filter status, payment status, đổi luồng Pending → Delivered" />
            <Panel title="Danh sách đơn" description="Có thể nối với Order và OrderItem">
              <DataTable
                columns={['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Thanh toán', 'Trạng thái']}
                rows={orders.map((order) => [order.code, order.customer, order.total, statusBadge(order.payment), statusBadge(order.status)])}
              />
            </Panel>
          </section>

          <section id="payments" className="space-y-6">
            <SectionHeader icon={CreditCard} title="Quản lý thanh toán" description="Theo dõi PaymentMethod và PaymentStatus" />
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Panel title="Hiệu suất cổng thanh toán" description="Paid / Failed / Refunded theo method">
                <ChartContainer
                  className="h-[320px] w-full"
                  config={{ paid: { label: 'Paid', color: '#10b981' }, failed: { label: 'Failed', color: '#ef4444' }, refunded: { label: 'Refunded', color: '#f59e0b' } }}
                >
                  <BarChart data={payments} margin={{ left: 12, right: 12, top: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="method" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="paid" fill="var(--color-paid)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="failed" fill="var(--color-failed)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="refunded" fill="var(--color-refunded)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </Panel>
              <Panel title="Tác vụ nhanh" description="Workflow xử lý thanh toán">
                <Checklist
                  items={[
                    'Đánh dấu Paid khi webhook xác nhận',
                    'Bắn cảnh báo khi Failed tăng đột biến',
                    'Cho phép xử lý Refund từ admin',
                    'Lưu lịch sử giao dịch theo mã thanh toán',
                  ]}
                />
              </Panel>
            </div>
          </section>

          <section id="warehouse" className="space-y-6">
            <SectionHeader icon={Warehouse} title="Quản lý kho" description="Warehouse, Batch và SerialNumber" />
            <Panel title="Tình trạng kho" description="Theo dõi còn hàng, đã bán, lỗi hoặc bảo hành">
              <DataTable
                columns={['Kho', 'Batch', 'Còn hàng', 'Đã bán', 'Bảo hành']}
                rows={warehouses.map((warehouse) => [warehouse.name, warehouse.batch, warehouse.available.toString(), warehouse.sold.toString(), warehouse.warranty.toString()])}
              />
            </Panel>
          </section>

          <section id="reviews" className="space-y-6">
            <SectionHeader icon={Star} title="Quản lý đánh giá" description="Kiểm duyệt review xấu và thống kê rating" />
            <Panel title="Review moderation" description="Ẩn/xóa review và theo dõi sentiment">
              <DataTable
                columns={['Sản phẩm', 'Rating', 'Khách hàng', 'Nội dung', 'Trạng thái']}
                rows={reviews.map((review) => [review.product, `${review.rating} sao`, review.author, review.excerpt, statusBadge(review.status)])}
              />
            </Panel>
          </section>

          <section id="chat" className="space-y-6">
            <SectionHeader icon={MessageSquareMore} title="Chat khách hàng" description="Realtime room, tin nhắn và trạng thái chat" />
            <Panel title="Chat room monitor" description="Quản lý ChatRoom, Message và phân công staff">
              <DataTable
                columns={['Room', 'Khách hàng', 'Tin nhắn cuối', 'Phụ trách', 'Trạng thái']}
                rows={chats.map((chat) => [chat.room, chat.customer, chat.lastMessage, chat.agent, statusBadge(chat.status)])}
              />
            </Panel>
          </section>

          <section id="ai-build" className="space-y-6">
            <SectionHeader icon={Sparkles} title="AI Build" description="Xem cấu hình user đã build, tổng giá và xu hướng phổ biến" />
            <Panel title="Build đã lưu" description="Dựa trên AiSavedBuild và AiBuildItem">
              <DataTable
                columns={['Tên build', 'Chủ sở hữu', 'Tổng giá', 'Số món', 'Xu hướng']}
                rows={aiBuilds.map((build) => [build.build, build.owner, build.total, build.items.toString(), statusBadge(build.trend)])}
              />
            </Panel>
          </section>

          <section id="verification" className="space-y-6">
            <SectionHeader icon={MailCheck} title="Xác thực email" description="Theo dõi OTP, request verify và trạng thái hoàn thành" />
            <Panel title="Email verification queue" description="Có thể nối EmailVerification để check mã OTP">
              <DataTable
                columns={['Email', 'OTP', 'Yêu cầu lúc', 'Hết hạn', 'Trạng thái']}
                rows={emailVerifications.map((item) => [item.email, item.otp, item.requestedAt, item.expiresAt, statusBadge(item.status)])}
              />
            </Panel>
          </section>

          <section id="roles" className="space-y-6">
            <SectionHeader icon={ShieldCheck} title="Phân quyền hệ thống" description="Role, Permission, RolePermission và middleware check quyền" />
            <div className="grid gap-6 xl:grid-cols-3">
              {roles.map((role) => (
                <Panel key={role.role} title={role.role} description="Danh sách permission đề xuất">
                  <div className="space-y-2">
                    {role.permissions.map((permission) => (
                      <div key={permission} className="flex items-center gap-2 rounded-2xl bg-secondary/70 px-3 py-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <code>{permission}</code>
                      </div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm text-primary shadow-sm">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" className="w-fit gap-2">
        <Activity className="h-4 w-4" />
        Xem API cần nối
      </Button>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-border/60 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-col gap-1">
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/40 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-4 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
          <Boxes className="mt-0.5 h-4 w-4 text-primary" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function statusBadge(value: string) {
  const tone =
    value === 'Active' || value === 'Paid' || value === 'Delivered' || value === 'Connected' || value === 'Published' || value === 'Popular' || value === 'Verified'
      ? 'bg-emerald-100 text-emerald-700'
      : value === 'Pending' || value === 'Processing' || value === 'Waiting' || value === 'Paused' || value === 'Need review' || value === 'Draft' || value === 'Stable'
        ? 'bg-amber-100 text-amber-700'
        : value === 'Shipping' || value === 'Admin' || value === 'Staff' || value === 'Open'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-rose-100 text-rose-700';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function pill(value: string) {
  return <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{value}</span>;
}
