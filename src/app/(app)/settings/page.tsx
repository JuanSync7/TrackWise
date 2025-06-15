
"use client";

import React, { useState, useEffect, Suspense } from 'react'; // Added React and Suspense
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { List, Palette, Bell, ShieldCheck, Trash2, Edit3, PlusCircle, Moon, Sun, TrendingUp, TrendingDown, Check, Loader2 } from 'lucide-react';
import { useTheme } from "next-themes";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import type { Category } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/constants'; // To identify default categories

// Lazy load CategoryForm
const CategoryForm = React.lazy(() => import('@/components/settings/category-form').then(module => ({ default: module.CategoryForm })));
type CategoryFormValues = import('@/components/settings/category-form').CategoryFormValues;


export default function SettingsPage() {
  const { categories, addCategory, updateCategory, deleteCategory: contextDeleteCategory } = usePersonalFinance();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const defaultCategoryIds = new Set(INITIAL_CATEGORIES.map(c => c.id));

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleOpenCategoryForm = (category?: Category) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleCloseCategoryForm = () => {
    setIsCategoryFormOpen(false);
    setEditingCategory(undefined);
  };

  const handleSaveCategory = async (data: CategoryFormValues) => {
    setIsSubmittingCategory(true);
    try {
      if (editingCategory) {
        updateCategory({ ...editingCategory, ...data });
        toast({ title: "Category Updated", description: `Category "${data.name}" has been updated.` });
      } else {
        addCategory(data);
        toast({ title: "Category Added", description: `Category "${data.name}" has been added.` });
      }
      handleCloseCategoryForm();
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save category." });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategoryRequest = (category: Category) => {
    if (defaultCategoryIds.has(category.id)) {
      toast({ variant: "destructive", title: "Cannot Delete", description: `Category "${category.name}" is a default category and cannot be deleted.` });
      return;
    }
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      contextDeleteCategory(categoryToDelete.id);
      toast({ title: "Category Deleted", description: `Category "${categoryToDelete.name}" has been deleted.` });
      setCategoryToDelete(null);
    }
  };


  if (!mounted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
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
            <CardDescription>View, add, edit, or delete your transaction categories.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {categories.sort((a, b) => a.name.localeCompare(b.name)).map(category => (
              <div key={category.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={category} size="sm" />
                  <span>{category.name}</span>
                  {category.appliesTo === 'income' && <Badge variant="outline" className="text-xs border-accent text-accent"><TrendingUp className="mr-1 h-3 w-3"/>Income</Badge>}
                  {category.appliesTo === 'expense' && <Badge variant="outline" className="text-xs border-destructive text-destructive"><TrendingDown className="mr-1 h-3 w-3"/>Expense</Badge>}
                  {category.appliesTo === 'both' && <Badge variant="outline" className="text-xs"><Check className="mr-1 h-3 w-3"/>Both</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCategoryForm(category)}>
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit {category.name}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive" 
                    onClick={() => handleDeleteCategoryRequest(category)}
                    disabled={defaultCategoryIds.has(category.id)}
                    title={defaultCategoryIds.has(category.id) ? "Default categories cannot be deleted" : `Delete ${category.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete {category.name}</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
             <Button variant="outline" className="w-full" onClick={() => handleOpenCategoryForm()}>
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

      {/* Category Form Dialog */}
      <Dialog open={isCategoryFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseCategoryForm(); else setIsCategoryFormOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the details of this category.' : 'Fill in the details for the new category.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CategoryForm
              category={editingCategory}
              onSave={handleSaveCategory}
              onCancel={handleCloseCategoryForm}
              isSubmitting={isSubmittingCategory}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting the category "{categoryToDelete?.name}" will reassign its transactions to "Other" (if available) and remove any associated budget goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
