# 🎨 Art-O-Mart - Marketplace Assistance for Local Artists

**Empowering artisans, connecting communities, celebrating craftsmanship.**

Art-O-Mart is a modern React-based marketplace platform designed specifically for artisans to showcase and sell their handcrafted products. Built for the Gen AI Exchange Hackathon, this application combines cutting-edge web technologies with a focus on supporting traditional craftsmanship and connecting artisans directly with customers.

## ✨ Project Overview

Art-O-Mart serves as a bridge between skilled artisans and customers who appreciate authentic, handcrafted products. The platform provides:

- **For Artisans**: A comprehensive platform to showcase their craft, manage inventory, process orders, and build their brand
- **For Customers**: A curated marketplace to discover unique handcrafted items, learn about artisan stories, and support local craftsmanship
- **For Communities**: A space to preserve traditional arts and crafts while embracing modern commerce

## 🚀 Key Features

### 🏪 **Marketplace Core**
- **Multi-vendor Platform**: Support for multiple artisans with individual storefronts
- **Product Catalog**: Comprehensive product listings with detailed descriptions, images, and artisan stories
- **Advanced Search & Filtering**: Find products by category, region, price, materials, and more
- **Featured Products**: Highlight exceptional craftsmanship and new arrivals

### 👤 **User Management**
- **Dual Role System**: Separate experiences for customers and artisans
- **Artisan Profiles**: Detailed business profiles with craft specialties, experience, and verification status
- **Customer Profiles**: Personalized shopping experience with order history and preferences
- **Authentication**: Secure Supabase-based authentication with social login options

### 🛒 **E-commerce Features**
- **Shopping Cart**: Persistent cart functionality across sessions
- **Wishlist**: Save favorite items for later
- **Order Management**: Complete order lifecycle from placement to delivery
- **Payment Integration**: Secure payment processing (ready for integration)
- **Address Management**: Multiple shipping and billing addresses

### 📱 **Modern Tech Stack**
- **React 18**: Latest React with concurrent features and improved performance
- **Vite**: Lightning-fast build tool and hot module replacement
- **Supabase**: Backend-as-a-Service with PostgreSQL, authentication, and real-time features
- **TailwindCSS**: Utility-first CSS framework with custom design system
- **Framer Motion**: Smooth animations and micro-interactions
- **React Router v6**: Modern client-side routing
- **React Hook Form**: Efficient form handling and validation

### 🎨 **User Experience**
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Progressive Web App**: Fast loading with offline capabilities
- **Dark/Light Mode**: Theme switching for user preference

## 🏗️ Architecture

### **Database Schema**
Our comprehensive database includes:
- **Users & Authentication**: User profiles with role-based access
- **Artisan Management**: Business profiles, craft specialties, verification system
- **Product Catalog**: Products with categories, reviews, and inventory tracking
- **E-commerce**: Orders, carts, wishlists, and payment tracking
- **Content Management**: Reviews, ratings, and user-generated content

### **Security Features**
- **Row Level Security (RLS)**: Database-level security with Supabase
- **Role-based Access Control**: Different permissions for customers, artisans, and admins
- **Data Validation**: Comprehensive input validation and sanitization
- **Secure File Storage**: Image uploads with file type and size restrictions

## 📋 Prerequisites

- **Node.js** (v16.x or higher)
- **npm** or **yarn**
- **Supabase Account** (for backend services)
- **Git** (for version control)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/fuzziecoder/Art-O-Mart-Gen-AI-Exchange-Hackathon-H2S
cd Art-O-Mart-Gen-AI-Exchange-Hackathon-H2S
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:4028
```

### 4. Database Setup
Run the Supabase migration:
```bash
# If using Supabase CLI
supabase db reset

# Or apply the migration file manually in your Supabase dashboard
# File: supabase/migrations/20250917163948_art_o_mart_marketplace.sql
```

### 5. Start Development Server
```bash
npm start
# or
yarn start
```

The application will be available at `http://localhost:4028`

## 📁 Project Structure

```
art-o-mart/
├── public/                    # Static assets
│   ├── images/               # Logo and branding assets
│   ├── manifest.json         # PWA configuration
│   └── robots.txt            # SEO configuration
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components
│   │   └── ErrorBoundary.jsx # Error handling
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx  # Authentication context
│   ├── pages/               # Page components
│   │   ├── login/           # Authentication pages
│   │   └── NotFound.jsx     # 404 page
│   ├── services/            # API services
│   │   └── marketplaceService.js
│   ├── lib/                 # Configuration
│   │   └── supabase.js      # Supabase client
│   ├── styles/              # Global styles
│   │   ├── index.css        # Main stylesheet
│   │   └── tailwind.css     # Tailwind imports
│   ├── utils/               # Utility functions
│   │   └── cn.js            # Class name utilities
│   ├── App.jsx              # Main application component
│   ├── Routes.jsx           # Application routing
│   └── index.jsx            # Application entry point
├── supabase/
│   └── migrations/          # Database migrations
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind configuration
├── vite.config.mjs          # Vite configuration
└── jsconfig.json            # JavaScript configuration
```

## 🔧 Available Scripts

```bash
# Development
npm start          # Start development server with HMR
npm run dev        # Alternative dev command

# Production
npm run build      # Build for production with source maps
npm run preview    # Preview production build locally
npm run serve      # Serve production build

# Utilities
npm run lint       # Run ESLint (if configured)
npm run test       # Run tests (if configured)
```

## 🛣️ Key Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page with featured products |
| `/login` | Login | User authentication |
| `/register` | Register | Multi-step registration |
| `/simple-register` | Simple Register | Single-page registration |
| `/products` | Product Catalog | Browse all products |
| `/product/:id` | Product Details | Individual product page |
| `/artisan/:id` | Artisan Profile | Artisan storefront |
| `/cart` | Shopping Cart | Cart management |
| `/checkout` | Checkout | Order placement |
| `/profile` | User Profile | Account management |
| `/dashboard` | Artisan Dashboard | Seller management |

## 🎨 Design System

### **Color Palette**
- **Primary**: Clean whites (#FFFFFF) for main backgrounds
- **Secondary**: Light grey (#ECEFF1) for cards and sections
- **Accent**: Warm earth tones reflecting artisan craft
- **Text**: High contrast for accessibility

### **Typography**
- **Headings**: Modern sans-serif for clarity
- **Body**: Readable fonts optimized for web
- **Fluid Typography**: Responsive text scaling

### **Components**
- **Modular Design**: Reusable components with consistent styling
- **Responsive Grid**: Flexible layouts for all screen sizes
- **Interactive Elements**: Hover states and smooth transitions

## 🔐 Authentication & Authorization

### **User Roles**
- **Customer**: Browse, purchase, review products
- **Artisan**: Manage products, process orders, view analytics
- **Admin**: Platform management, user verification, content moderation

### **Authentication Flow**
1. **Registration**: Email/password or social login
2. **Profile Setup**: Role selection and additional information
3. **Verification**: Email verification and artisan verification process
4. **Session Management**: Persistent login with refresh tokens

## 📊 Database Features

### **Core Entities**
- **Users**: Authentication and basic profile information
- **Artisans**: Business profiles with craft specialties
- **Products**: Detailed product catalog with categories
- **Orders**: Complete order lifecycle management
- **Reviews**: Product reviews and ratings system

### **Advanced Features**
- **Full-text Search**: Search across products and artisans
- **Inventory Management**: Stock tracking and low-stock alerts
- **Analytics**: Sales data and performance metrics
- **Notifications**: Real-time updates for orders and messages

## 🚀 Deployment

### **Production Build**
```bash
npm run build
```

### **Deployment Options**
- **Vercel**: Recommended for React applications
- **Netlify**: Great for static site hosting
- **Supabase**: Can host the frontend directly
- **Custom Server**: Deploy to any Node.js hosting

### **Environment Variables for Production**
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_APP_URL=https://your-domain.com
```

## 🧪 Testing

### **Testing Setup**
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **Cypress**: End-to-end testing (ready for implementation)

### **Running Tests**
```bash
npm test              # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 🔄 Development Workflow

### **Adding New Features**
1. **Create Feature Branch**: `git checkout -b feature/feature-name`
2. **Develop**: Write code following existing patterns
3. **Test**: Ensure functionality works correctly
4. **Review**: Code review process
5. **Deploy**: Merge to main and deploy

### **Database Changes**
1. **Create Migration**: New SQL migration file
2. **Test Locally**: Verify migration works
3. **Apply to Production**: Run migration on production database
4. **Update Services**: Update API services if needed

## 📈 Performance Optimizations

- **Code Splitting**: Lazy loading for better performance
- **Image Optimization**: Compressed and responsive images
- **Caching**: Browser and service worker caching
- **Bundle Analysis**: Webpack bundle analyzer integration
- **CDN**: Static asset delivery via CDN

## 🔧 Contributing

### **Development Guidelines**
1. **Follow Conventions**: Use existing code patterns
2. **Write Tests**: Include tests for new features
3. **Documentation**: Update README for significant changes
4. **Performance**: Consider performance impact of changes
5. **Accessibility**: Ensure all features are accessible

### **Commit Messages**
```
type(scope): description

feat(auth): add social login with Google
fix(cart): resolve quantity update issue
docs(readme): update installation instructions
```

## 🐛 Troubleshooting

### **Common Issues**

**Port Already in Use**
```bash
# Kill process on port 4028
lsof -ti:4028 | xargs kill -9
# Or use different port
npm start -- --port 3000
```

**Supabase Connection Issues**
```bash
# Verify environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Resources

- **[React Documentation](https://react.dev/)**: Official React docs
- **[Supabase Docs](https://supabase.com/docs)**: Backend services documentation
- **[Tailwind CSS](https://tailwindcss.com/)**: Styling framework docs
- **[Vite Guide](https://vitejs.dev/)**: Build tool documentation

## 🏆 Hackathon Information

**Event**: Generative AI Exchange Hackathon Hack2Skill 
**Team**: Cogito Coders 
**Theme**: Empowering traditional artisans through modern technology  
**Goal**: Create a sustainable platform for artisan communities  

## 📄 License

This project is created for the Gen AI Exchange Hackathon. See the hackathon guidelines for usage terms.

## 🙏 Acknowledgments

- **Hackathon Organizers**: For providing this opportunity to innovate
- **Artisan Community**: For inspiring this platform
- **Open Source Community**: For the amazing tools and libraries
- **React Team**: For the fantastic framework
- **Supabase Team**: For the excellent backend services
- **Tailwind Team**: For the beautiful styling framework

---

**PEACE✌️**  
*Preserving tradition, embracing innovation*

For support or questions, please contact the development team or create an issue in the repository.
