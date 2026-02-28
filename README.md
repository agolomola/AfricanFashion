# African Fashion Marketplace

A full-stack eCommerce platform connecting African fashion designers, fabric sellers, and customers worldwide.

## Features

### Multi-User Platform
- **Customers**: Browse designs, customize with fabrics, virtual try-on, place orders
- **Fabric Sellers**: Manage fabric inventory, fulfill fabric orders
- **Fashion Designers**: Create designs, manage production orders
- **QA Team**: Quality assurance, order inspection, shipping management
- **Administrators**: User management, pricing rules, order oversight

### Key Features
- **3D Virtual Try-On**: Generate personalized avatars from measurements
- **Order Splitting**: One order creates parallel views for Admin, Fabric Seller, and Designer
- **Location-Based Matching**: Fabric sellers matched with designers in the same country
- **Dynamic Pricing**: Admin-configurable markup/markdown by product type, country, or date range
- **Stripe Payment Integration**: Secure payment processing
- **Real-time Order Tracking**: Track order status across all parties

## Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Payments**: Stripe
- **File Uploads**: Multer

### Frontend
- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **3D Rendering**: React Three Fiber + Three.js
- **Payments**: Stripe React

## Project Structure

```
african-fashion-platform/
├── apps/
│   ├── api/                 # Express backend API
│   │   ├── src/
│   │   │   ├── routes/      # API routes by feature
│   │   │   ├── middleware/  # Auth, validation middleware
│   │   │   └── utils/       # Utility functions
│   │   └── prisma/
│   │       └── schema.prisma # Database schema
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── pages/       # Page components
│       │   ├── components/  # Reusable components
│       │   ├── store/       # Zustand stores
│       │   └── services/    # API services
│       └── public/
└── packages/
    └── database/            # Shared Prisma client
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Stripe account

### Backend Setup

1. Navigate to the API directory:
```bash
cd apps/api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/african_fashion"
JWT_SECRET="your-jwt-secret"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
FRONTEND_URL="http://localhost:5173"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database:
```bash
npx prisma db seed
```

6. Start the development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the web directory:
```bash
cd apps/web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
VITE_API_URL="http://localhost:3001/api"
VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

4. Start the development server:
```bash
npm run dev
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile

### Products
- `GET /api/products/designs` - List designs
- `GET /api/products/designs/:id` - Get design details
- `GET /api/products/fabrics` - List fabrics
- `GET /api/products/fabrics/:id` - Get fabric details

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status

### Customer
- `GET /api/customer/orders` - Get customer orders
- `POST /api/customer/measurements` - Save measurements
- `GET /api/customer/addresses` - Get addresses

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/status` - Update user status
- `GET /api/admin/pricing-rules` - List pricing rules
- `POST /api/admin/pricing-rules` - Create pricing rule

### Fabric Seller
- `GET /api/fabric-seller/dashboard` - Seller dashboard
- `GET /api/fabric-seller/fabrics` - List seller fabrics
- `GET /api/fabric-seller/orders` - List fabric orders

### Designer
- `GET /api/designer/dashboard` - Designer dashboard
- `GET /api/designer/designs` - List designer designs
- `GET /api/designer/orders` - List design orders

### QA
- `GET /api/qa/dashboard` - QA dashboard
- `GET /api/qa/pending` - Get pending QA items
- `POST /api/qa/review` - Submit QA review

## Order Flow

1. **Customer** selects a design and fabric
2. **Customer** enters measurements and uses virtual try-on
3. **Customer** completes payment via Stripe
4. **System** creates order and splits into:
   - Full order for **Admin**
   - Fabric order for **Fabric Seller**
   - Design order for **Designer**
5. **Fabric Seller** ships fabric to designer
6. **Designer** receives fabric and starts production
7. **Designer** completes production, sends to QA
8. **QA Team** inspects and approves/rejects
9. **QA Team** ships to customer
10. **Customer** receives order and can request refund if needed

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| CUSTOMER | Browse, order, track orders, manage profile |
| FABRIC_SELLER | Manage fabrics, fulfill fabric orders |
| DESIGNER | Create designs, manage production orders |
| QA_TEAM | Quality inspection, shipping management |
| ADMINISTRATOR | Full system access, user management, pricing rules |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@africanfashion.com or join our Slack channel.
