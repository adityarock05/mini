"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsProfileLoading(true);
    const formData = new FormData(e.currentTarget);
    const display_name = formData.get("display_name") as string;
    const department = formData.get("department") as string;

    try {
      const updatedUser = await usersApi.updateMe({ display_name, department });
      setUser(updatedUser);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPasswordLoading(true);
    const formData = new FormData(e.currentTarget);
    const current_password = formData.get("current_password") as string;
    const new_password = formData.get("new_password") as string;
    const confirm_password = formData.get("confirm_password") as string;

    if (new_password !== confirm_password) {
      toast.error("New passwords do not match");
      setIsPasswordLoading(false);
      return;
    }

    try {
      await usersApi.changePassword({ current_password, new_password });
      toast.success("Password changed successfully");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error("Failed to change password");
      console.error(error);
    } finally {
      setIsPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">Settings</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input 
                    id="display_name" 
                    name="display_name" 
                    defaultValue={user?.display_name || ""} 
                    placeholder="Your Name" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    name="department" 
                    defaultValue={user?.department || ""} 
                    placeholder="e.g. Computer Science" 
                  />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={user?.role || ""} disabled />
                </div>
                <Button type="submit" disabled={isProfileLoading}>
                  {isProfileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input 
                    id="current_password" 
                    name="current_password" 
                    type="password" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input 
                    id="new_password" 
                    name="new_password" 
                    type="password" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input 
                    id="confirm_password" 
                    name="confirm_password" 
                    type="password" 
                    required 
                  />
                </div>
                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
