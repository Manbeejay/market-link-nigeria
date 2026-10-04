import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [userType, setUserType] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone_number, location, user_type")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        toast.error("Could not load your profile.");
      } else if (data) {
        setFullName(data.full_name ?? "");
        setPhoneNumber(data.phone_number ?? "");
        setLocation(data.location ?? "");
        setUserType(data.user_type ?? "");
      }
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Your name can't be empty.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        location: location.trim(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your changes.");
    } else {
      toast.success("Your details have been updated.");
    }
  };

  const roleLabel =
    userType === "both" ? "Farmer & Buyer" : userType === "farmer" ? "Farmer" : userType === "buyer" ? "Buyer" : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-7 w-7 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              This is what other members see about you, and how we reach you about your orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingProfile ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                  <p className="text-xs text-gray-500">
                    Your email is used to sign in and can't be changed here.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Account type</Label>
                  <div>
                    <Badge variant="secondary">{roleLabel}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">Contact us if you need this changed.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Nsukka, Enugu State"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
