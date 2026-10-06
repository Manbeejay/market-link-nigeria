import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

const ResetPassword = () => {
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) setChecked(true);
  }, [loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords don’t match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await updatePassword(password);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await signOut();
    setUpdated(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center"><Logo size="lg" showText className="mb-4 justify-center" /></div>
        <Card>
          <CardHeader>
            <CardTitle>{updated ? "Password updated" : "Choose a new password"}</CardTitle>
            <CardDescription>
              {updated ? "Your password has been changed. Sign in with your new password." : "Enter and confirm your new password to secure your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {updated ? (
              <Button className="w-full" onClick={() => navigate("/auth")}>Go to sign in</Button>
            ) : !checked ? (
              <p className="text-sm text-muted-foreground">Checking your recovery link…</p>
            ) : !session ? (
              <div className="space-y-4">
                <Alert variant="destructive"><AlertDescription>This password reset link is invalid or has expired. Request a new one to continue.</AlertDescription></Alert>
                <Button asChild className="w-full"><Link to="/auth">Request a new link</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </div>
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Update password"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ResetPassword;