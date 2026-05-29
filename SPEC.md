# UrbanEx - Streetwear E-Commerce Platform Specification

## Project Overview
- **Project Name**: UrbanEx
- **Type**: Full-stack e-commerce web application
- **Core Functionality**: Streetwear marketplace with custom WhatsApp-driven checkout flow
- **Target Users**: Indian streetwear enthusiasts seeking authentic premium footwear/apparel

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: CSS Modules with custom dark theme

---

## 1. UI/UX Specification

### Color Palette
- **Background Primary**: `#0a0a0a` (near black)
- **Background Secondary**: `#141414` (card backgrounds)
- **Background Tertiary**: `#1a1a1a` (hover states)
- **Accent Primary**: `#39ff14` (neon green - brand accent)
- **Accent Secondary**: `#32d912` (darker green for hover)
- **Text Primary**: `#ffffff` (white)
- **Text Secondary**: `#a0a0a0` (muted gray)
- **Text Muted**: `#666666` (dark gray)
- **Border Color**: `#39ff14` (neon green)
- **Success**: `#00ff88`
- **Error**: `#ff4444`
- **Warning**: `#ffaa00`

### Typography
- **Primary Font**: "Bebas Neue", sans-serif (headings)
- **Secondary Font**: "Inter", sans-serif (body text)
- **Heading Sizes**: H1: 48px, H2: 36px, H3: 24px, H4: 18px
- **Body Size**: 16px base, 14px small
- **Font Weight**: 400 normal, 600 semibold, 700 bold

### Layout Structure
- **Max Content Width**: 1400px
- **Grid**: CSS Grid with 12-column system
- **Spacing Scale**: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64, 96)
- **Border Radius**: 0px (sharp edges for streetwear aesthetic)
- **Border Style**: 2px dashed for accent borders

### Global Entry Popup
- **Type**: Modal overlay, non-dismissible until clicked
- **Trigger**: Initial page load only (session cookie controls)
- **Design**:
  - Dark background with dashed neon green border
  - Centered content box, max-width 500px
  - Z-index: 9999 (highest priority)
- **Content**:
  - Headline: "STORE NOTICE" in accent color
  - Body 1: Payment advance explanation (₹300)
  - Subhead: "💯 100% Authentic Pair Guaranteed" in accent
  - Body 2-3: Delivery assurance text
- **Action**: "CLOSE" button, stores session cookie `urbanex_popup=shown`

### Brand Navigation
- **Type**: Horizontal carousel/grid on homepage
- **Display**: Brand logos in circular/rectangular frames
- **Interaction**: Click filters products by brand
- **Brands**: Nike, Adidas, Jordan, Puma, New Balance, Reebok, Converse, Vans

### Product Cards
- **Image**: High-res product image with hover zoom
- **Info**: Product name, brand tag, price (₹X,XXX)
- **CTA**: "View" button with accent border

---

## 2. Database Schema (PostgreSQL)

### Brands Table
```sql
CREATE TABLE brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  brand_id INTEGER REFERENCES brands(id),
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  images TEXT[], -- array of image URLs
  sizes JSONB, -- { "US": ["7", "8", "9", "10", "11"] }
  colors JSONB, -- [{ "name": "Black", "hex": "#000000" }]
  category VARCHAR(50), -- 'sneakers', 'apparel', 'accessories'
  in_stock BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  name VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE, -- UEX-XXXXXX format
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  size VARCHAR(20),
  color VARCHAR(50),
  quantity INTEGER DEFAULT 1,
  total_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'Pending Advance', -- Pending Advance, Paid, Shipped, Delivered
  advance_paid BOOLEAN DEFAULT false,
  whatsapp_lead_sent BOOLEAN DEFAULT false,
  shipping_name VARCHAR(100),
  shipping_address TEXT,
  shipping_email VARCHAR(255),
  shipping_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Endpoints (Express Backend)

### Products
- `GET /api/products` - List all products (with filters: brand, category)
- `GET /api/products/:slug` - Get single product by slug
- `GET /api/products/featured` - Get featured products

### Brands
- `GET /api/brands` - List all brands

### Orders
- `POST /api/orders` - Create new order (saves to DB with "Pending Advance" status)
- `GET /api/orders/:orderId` - Get order by ID

### Users
- `POST /api/users` - Create/update user

---

## 4. Checkout Flow (CRITICAL)

### Checkout Page Requirements
- Form fields: Full Name, Shipping Address, Email, Phone Number
- Payment option displayed: "Cash on Delivery (Requires ₹300 Advance)" only
- Product summary: Product name, size selected, price

### Order Submission Sequence
1. **Save to DB**: Insert order with status "Pending Advance"
2. **Generate Order ID**: Format UEX-XXXXXX (6-digit random)
3. **UI Redirect**: Navigate to `/order-confirmation` page
4. **Confirmation Page Display**: "Order placed. Our team will get in touch shortly."
5. **WhatsApp Redirect**: Open new tab with pre-filled message:
   ```
   Hello UrbanEx, I just placed an order! My Order ID is UEX-123456. I am ready to pay the ₹300 advance to confirm.
   ```
   WhatsApp Link: `https://wa.me/919898285850?text=URL_ENCODED_MESSAGE`

---

## 5. Page Structure

### Pages (Next.js App Router)
- `/` - Homepage with brands carousel, featured products
- `/products` - Product listing page with filters
- `/products/[slug]` - Product detail page (PDP)
- `/checkout` - Checkout form
- `/order-confirmation` - Order success page with WhatsApp redirect

### Components
- `GlobalPopup` - Entry modal component
- `BrandCarousel` - Brand navigation component
- `ProductCard` - Product display card
- `ProductGallery` - Image gallery for PDP
- `SizeSelector` - Size variant selector
- `CheckoutForm` - Order form with validation
- `OrderSummary` - Cart/order summary display
- `Header` - Navigation header
- `Footer` - Site footer

---

## 6. Acceptance Criteria

### Global Popup
- [ ] Appears on first visit (no popup cookie present)
- [ ] Dashed neon green border visible
- [ ] Cannot be dismissed via escape key or clicking outside
- [ ] "CLOSE" button hides popup and sets cookie
- [ ] Cookie prevents popup on subsequent pages

### Brand Navigation
- [ ] Displays all brand logos on homepage
- [ ] Clicking brand filters to product page with brand filter
- [ ] URL updates to reflect filter (e.g., `/products?brand=nike`)

### Product Pages
- [ ] Server-side rendered product detail
- [ ] High-res images display correctly
- [ ] Size selector works and shows available sizes
- [ ] Price displays in INR format (₹X,XXX)
- [ ] "Add to Cart" / "Buy Now" buttons functional

### Checkout Flow
- [ ] All form fields required and validated
- [ ] Only COD advance payment option shown
- [ ] Order saves to PostgreSQL with "Pending Advance" status
- [ ] Order ID generated in UEX-XXXXXX format
- [ ] Redirects to confirmation page after submission
- [ ] Confirmation page shows success message
- [ ] WhatsApp opens with pre-filled order message
- [ ] No Stripe/Razorpay integration present