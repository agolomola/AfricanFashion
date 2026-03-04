import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingBag, User, Menu, X, Search, Heart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import Footer from '../components/Footer';

export default function MainLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();

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

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/ready-to-wear' },
    { label: 'Fabrics To Buy', href: '/fabrics' },
    { label: 'Ready To Wear', href: '/ready-to-wear' },
    { label: 'Custom To Wear', href: '/designs' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white bg-opacity-95 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              className={`font-display text-xl lg:text-2xl font-bold transition-colors ${
                isScrolled ? 'text-navy-600' : 'text-white'
              }`}
            >
              African Fashion
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`text-sm font-medium transition-colors relative group ${
                    isScrolled
                      ? 'text-gray-700 hover:text-coral-500'
                      : 'text-white hover:text-white'
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

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                className={`p-2 rounded-full transition-colors ${
                  isScrolled
                    ? 'hover:bg-gray-100 text-gray-700'
                    : 'hover:bg-white bg-opacity-10 text-white'
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                to="/cart"
                className={`p-2 rounded-full transition-colors relative ${
                  isScrolled
                    ? 'hover:bg-gray-100 text-gray-700'
                    : 'hover:bg-white bg-opacity-10 text-white'
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
                        : 'hover:bg-white bg-opacity-10 text-white'
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
                      : 'bg-white text-navy-600 hover:bg-white bg-opacity-90'
                  }`}
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden p-2 rounded-full transition-colors ${
                  isScrolled
                    ? 'hover:bg-gray-100 text-gray-700'
                    : 'hover:bg-white bg-opacity-10 text-white'
                }`}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-lg"
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-navy-600 font-medium hover:bg-navy-50 rounded-lg"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
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
