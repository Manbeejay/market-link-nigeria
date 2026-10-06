import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useSubscription } from '@/hooks/useSubscription';

type UserType = 'farmer' | 'buyer' | 'both';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [isSignUp, setIsSignUp] = useState(Boolean(roleParam));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<UserType>(
    roleParam === 'farmer' || roleParam === 'both' ? roleParam : 'buyer'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { signUp, signIn, requestPasswordReset, user } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || subLoading) return;
    navigate(isActive ? '/' : '/subscribe');
  }, [user, subLoading, isActive, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await requestPasswordReset(email);
        if (error) setError(error.message);
        else setResetSent(true);
      } else if (isSignUp) {
        if (!fullName.trim()) {
          setError('Full name is required');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, userType);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setConfirmationSent(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" showText={true} className="justify-center mb-6" />
          <h2 className="text-3xl font-bold text-gray-900">
            {isSignUp ? 'Create your account' : isForgotPassword ? 'Reset your password' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp
              ? 'Join MarketLink Nigeria to connect with farmers and buyers'
              : isForgotPassword ? 'Enter your email and we’ll send a password reset link.' : 'Welcome back! Please sign in to continue'}
          </p>
        </div>

        {confirmationSent || resetSent ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <p className="font-medium text-gray-900">Check your email</p>
              <p className="text-sm text-gray-600">
                {confirmationSent ? "We've sent a confirmation link" : "If an account exists for this email, we've sent a password reset link"} to <span className="font-medium">{email}</span>.
                {confirmationSent ? ' Click it to activate your account, then come back and sign in.' : ' Open it to choose a new password.'}
              </p>
              {resetSent && <Button variant="link" onClick={() => { setResetSent(false); setIsForgotPassword(false); }}>Back to sign in</Button>}
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? 'Sign Up' : isForgotPassword ? 'Password recovery' : 'Sign In'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Enter your details to create your account' : isForgotPassword ? 'We’ll email you a secure link to choose a new password.' : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isSignUp}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label>I want to join as</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(['farmer', 'buyer', 'both'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setUserType(type)}
                          className={`py-2 px-2 rounded-md border text-sm font-medium capitalize transition-colors ${
                            userType === type
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 text-gray-600 hover:border-green-300'
                          }`}
                        >
                          {type === 'both' ? 'Both' : type}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>

              {!isForgotPassword && <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                />
              </div>}

              {!isSignUp && !isForgotPassword && (
                <div className="text-right">
                  <Button type="button" variant="link" className="h-auto px-0 text-green-700" onClick={() => { setIsForgotPassword(true); setError(''); }}>
                    Forgot password?
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : isForgotPassword ? 'Send reset link' : 'Sign In'}
              </Button>
            </form>

            {!isForgotPassword && <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="text-green-600 hover:text-green-700"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </div>}
            {isForgotPassword && <div className="mt-4 text-center">
              <Button variant="link" onClick={() => { setIsForgotPassword(false); setError(''); }} className="text-green-600 hover:text-green-700">Back to sign in</Button>
            </div>}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
