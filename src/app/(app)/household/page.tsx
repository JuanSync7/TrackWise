
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';
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
import { useAppContext } from '@/contexts/app-context';
import { useToast } from "@/hooks/use-toast";
import type { Member } from '@/lib/types';
import { MemberForm } from '@/components/household/member-form';
import { MemberList } from '@/components/household/member-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function HouseholdPage() {
  const { members, addMember, deleteMember: contextDeleteMember } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const handleSaveMember = async (data: Omit<Member, 'id'>) => {
    setIsSubmitting(true);
    try {
      addMember(data);
      toast({ title: "Member Added", description: `${data.name} has been added to the household.` });
      setIsFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add member. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    setMemberToDelete(memberId);
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      const member = members.find(m => m.id === memberToDelete);
      contextDeleteMember(memberToDelete);
      toast({ title: "Member Deleted", description: `${member?.name || 'The member'} has been removed from the household.` });
      setMemberToDelete(null);
    }
  };
  
  const openFormForNew = () => {
    setIsFormOpen(true);
  }

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members of your household for shared budgeting and expense tracking."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Member
          </Button>
        }
      />
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Household Member</DialogTitle>
            <DialogDescription>
              Enter the name of the new household member.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            onSave={handleSaveMember}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member from the household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Household Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList 
            members={members}
            onDeleteMember={handleDeleteMember}
          />
        </CardContent>
      </Card>

      {/* Placeholder for future contribution/shared expense features */}
      <Card className="mt-8 opacity-50">
        <CardHeader>
            <CardTitle>Shared Budgeting & Contributions (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center h-40 text-center">
                <img src="https://placehold.co/300x150.png" data-ai-hint="money teamwork" alt="Coming soon" className="mb-4 rounded-lg opacity-70" />
                <p className="text-muted-foreground">Functionality to manage shared budgets, track contributions, and split expenses among household members will be added here.</p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
