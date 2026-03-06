import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingBag, User, Menu, X, Search, Heart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import Footer from '../components/Footer';
import { useCurrency } from '../components/ui/CurrencyProvider';

export default function MainLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { selectedCurrency, defaultCurrency, supportedCurrencies, setSelectedCurrency } = useCurrency();
  const navigate = useNavigate();

  const currencyOptions = Array.from(
    new Set([selectedCurrency, defaultCurrency, 'USD', ...supportedCurrencies].filter(Boolean))
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const hamburgerLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/ready-to-wear' },
    { label: 'Ready To Wear', href: '/ready-to-wear' },
    { label: 'Fabric To Buy', href: '/fabrics' },
    { label: 'Custom To Wear', href: '/designs' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
  ];

  const rightNavLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/ready-to-wear' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 lg:h-20">
            {/* Left: Hamburger for category links */}
            <div className="flex-1 flex items-center min-w-0">
              <div className="relative">
                <button
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  className={`p-2 rounded-full transition-colors ${
                    isScrolled
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-white/10 text-white'
                  }`}
                  aria-label="Toggle product categories menu"
                >
                  {isCategoryMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                {isCategoryMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                    {hamburgerLinks.map((link) => (
                      <Link
                        key={link.label}
                        to={link.href}
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center: Logo */}
            <div className="flex-shrink-0 px-8 lg:px-12">
              <Link
                to="/"
                className={`font-display text-xl lg:text-2xl font-bold transition-colors ${
                  isScrolled ? 'text-navy-600' : 'text-white'
                }`}
              >
                African Fashion
              </Link>
            </div>

            {/* Right: Remaining menu + actions */}
            <div className="flex-1 flex items-center justify-end gap-2 lg:gap-5 min-w-0">
              <nav className="hidden md:flex items-center gap-7 mr-4">
                {rightNavLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`text-sm font-medium transition-colors relative group ${
                      isScrolled
                        ? 'text-gray-700 hover:text-coral-500'
                        : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${
                        isScrolled ? 'bg-coral-500' : 'bg-white'
                      }`}
                    />
                  </Link>
                ))}
              </nav>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className={`hidden sm:block rounded-md border px-2 py-1 text-xs ${
                  isScrolled ? 'bg-white text-gray-700 border-gray-300' : 'bg-white/90 text-navy-700 border-white/40'
                }`}
              >
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              <button
                className={`p-2 rounded-full transition-colors ${
                  isScrolled
                    ? 'hover:bg-gray-100 text-gray-700'
                    : 'hover:bg-white/10 text-white'
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                to="/cart"
                className={`p-2 rounded-full transition-colors relative ${
                  isScrolled
                    ? 'hover:bg-gray-100 text-gray-700'
                    : 'hover:bg-white/10 text-white'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                {getItemCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getItemCount()}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative group">
                  <button
                    className={`p-2 rounded-full transition-colors ${
                      isScrolled
                        ? 'hover:bg-gray-100 text-gray-700'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className={`hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isScrolled
                      ? 'bg-navy-600 text-white hover:bg-navy-700'
                      : 'bg-white text-navy-600 hover:bg-white/90'
                  }`}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
