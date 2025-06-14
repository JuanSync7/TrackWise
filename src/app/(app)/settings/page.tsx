
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Button } from '@/components/ui/button';
import { List, Palette, Bell, ShieldCheck, Trash2, Edit3, PlusCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from "next-themes";
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { categories } = useAppContext();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="container mx-auto">
      <PageHeader 
        title="Settings"
        description="Manage your application preferences and account details."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/> Manage Categories</CardTitle>
            <CardDescription>View and manage your expense categories.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-60 overflow-y-auto">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={category} size="sm" />
                  <span>{category.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
             <Button variant="outline" className="w-full" disabled>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
             </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/> Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Toggle between light and dark themes.</p>
            <Button onClick={toggleTheme} className="mt-4">
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/> Notifications</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Notification settings will be available here.</p>
             <Button className="mt-4" variant="outline" disabled>Configure Notifications</Button>
          </CardContent>
        </Card>

         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/> Account & Security</CardTitle>
            <CardDescription>Manage your account and security settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Account management options will be available here.</p>
             <Button className="mt-4" variant="outline" disabled>Change Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
