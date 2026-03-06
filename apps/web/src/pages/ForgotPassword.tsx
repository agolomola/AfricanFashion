import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your account email and we&apos;ll help you regain access.
        </p>

        {submitted && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            If an account exists for <span className="font-medium">{email}</span>, reset guidance will be sent.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Send reset instructions
          </Button>
        </form>

        <div className="mt-5 text-sm text-gray-600 flex items-center justify-between">
          <Link to="/login" className="text-coral-500 hover:text-coral-600 font-medium">
            Back to Sign In
          </Link>
          <Link to="/contact" className="text-gray-600 hover:text-gray-900">
            Need help?
          </Link>
        </div>
      </div>
    </div>
  );
}
