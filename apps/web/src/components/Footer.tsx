import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="font-display text-xl font-bold mb-4">African Fashion</h3>
            <p className="text-white text-opacity-70 text-sm leading-relaxed mb-4">
              Wear the story of Africa.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white bg-opacity-10 rounded flex items-center justify-center hover:bg-white bg-opacity-20 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white bg-opacity-10 rounded flex items-center justify-center hover:bg-white bg-opacity-20 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white bg-opacity-10 rounded flex items-center justify-center hover:bg-white bg-opacity-20 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-white text-opacity-70">
              <li><Link to="/ready-to-wear" className="hover:text-white transition-colors">Ready To Wear</Link></li>
              <li><Link to="/custom-to-wear" className="hover:text-white transition-colors">Custom To Wear</Link></li>
              <li><Link to="/fabrics-to-sell" className="hover:text-white transition-colors">Fabrics To Sell</Link></li>
              <li><Link to="/ready-to-wear" className="hover:text-white transition-colors">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white text-opacity-70">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/designers" className="hover:text-white transition-colors">Our Designers</Link></li>
              <li><Link to="/sustainability" className="hover:text-white transition-colors">Sustainability</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-white text-opacity-70">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link to="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:text-white transition-colors">Returns</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-white text-opacity-70">
              <li>hello@africanfashion.com</li>
              <li>+1 (555) 123-4567</li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white text-opacity-50">
            © 2026 African Fashion. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white text-opacity-50">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
