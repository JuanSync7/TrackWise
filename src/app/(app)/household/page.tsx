
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, DollarSign, ClipboardList } from 'lucide-react';
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
import type { Member, Contribution } from '@/lib/types';
import { MemberForm } from '@/components/household/member-form';
import { MemberList } from '@/components/household/member-list';
import { ContributionForm, type ContributionFormValues } from '@/components/household/contribution-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import Link from 'next/link';

export default function HouseholdPage() {
  const { members, addMember, deleteMember: contextDeleteMember, addContribution, getMemberTotalContribution } = useAppContext();
  const { toast } = useToast();

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<Member | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const handleSaveMember = async (data: Omit<Member, 'id'>) => {
    setIsSubmittingMember(true);
    try {
      addMember(data);
      toast({ title: "Member Added", description: `${data.name} has been added to the household.` });
      setIsMemberFormOpen(false);
    } catch (error) { 
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add member. Please try again." });
    } finally {
      setIsSubmittingMember(false);
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
  
  const openMemberFormForNew = () => {
    setIsMemberFormOpen(true);
  };

  const handleAddContributionClick = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMemberForContribution(member);
      setIsContributionFormOpen(true);
    }
  };

  const handleSaveContribution = async (data: ContributionFormValues) => {
    if (!selectedMemberForContribution) return;
    setIsSubmittingContribution(true);
    try {
      const contributionData: Omit<Contribution, 'id'> = {
        ...data,
        memberId: selectedMemberForContribution.id,
        date: format(data.date, "yyyy-MM-dd"),
      };
      addContribution(contributionData);
      toast({ title: "Contribution Added", description: `Contribution from ${selectedMemberForContribution.name} recorded.` });
      setIsContributionFormOpen(false);
      setSelectedMemberForContribution(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save contribution. Please try again." });
    } finally {
      setIsSubmittingContribution(false);
    }
  };
  
  const totalHouseholdContributions = members.reduce((sum, member) => sum + getMemberTotalContribution(member.id), 0);

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members, track contributions, and oversee shared finances."
        actions={
          <Button onClick={openMemberFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Member
          </Button>
        }
      />
      
      <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Household Member</DialogTitle>
            <DialogDescription>
              Enter the name of the new household member.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            onSave={handleSaveMember}
            onCancel={() => setIsMemberFormOpen(false)}
            isSubmitting={isSubmittingMember}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isContributionFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedMemberForContribution(null);
        setIsContributionFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Contribution for {selectedMemberForContribution?.name}</DialogTitle>
            <DialogDescription>
              Record a new contribution from this household member.
            </DialogDescription>
          </DialogHeader>
          <ContributionForm
            onSave={handleSaveContribution}
            onCancel={() => {
              setIsContributionFormOpen(false);
              setSelectedMemberForContribution(null);
            }}
            isSubmitting={isSubmittingContribution}
            memberName={selectedMemberForContribution?.name}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member and all their associated contributions from the household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Household Members ({members.length})
              </CardTitle>
              <CardDescription>View and manage your household members and their contributions. Log shared expenses under the &quot;Household Expenses&quot; category.</CardDescription>
            </CardHeader>
            <CardContent>
              <MemberList 
                members={members}
                onDeleteMember={handleDeleteMember}
                onAddContribution={handleAddContributionClick}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                    Household Pot
                </CardTitle>
                <CardDescription>Total contributions from all members available for shared expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{DEFAULT_CURRENCY}{totalHouseholdContributions.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">This is the sum of all recorded contributions. Use the &quot;Household Expenses&quot; category when adding shared expenses.</p>
            </CardContent>
           </Card>

           <Card>
            <CardHeader>
              <CardTitle  className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                Shared Shopping List
              </CardTitle>
              <CardDescription>Manage items your household needs to buy together.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Keep track of groceries and other shared items the household plans to purchase.</p>
            </CardContent>
            <CardFooter>
              <Link href="/household/shopping-list" passHref legacyBehavior>
                <Button asChild className="w-full">
                  <a>
                    <ClipboardList className="mr-2 h-4 w-4" /> View Shopping List
                  </a>
                </Button>
              </Link>
            </CardFooter>
          </Card>


          <Card>
            <CardHeader>
                <CardTitle>Shared Budgeting (Coming Soon)</CardTitle>
                 <CardDescription>Manage shared household budgets and track group spending against them.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-40 text-center">
                    <img src="https://placehold.co/300x150.png" data-ai-hint="budget planning" alt="Coming soon for shared budgeting" className="mb-4 rounded-lg opacity-70" />
                    <p className="text-muted-foreground text-sm">Functionality to create shared budgets and allocate household funds will be here.</p>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Expense Splitting (Coming Soon)</CardTitle>
                <CardDescription>Easily split shared expenses among members and track reimbursements.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-40 text-center">
                    <img src="https://placehold.co/300x150.png" data-ai-hint="shared finances" alt="Coming soon for expense splitting" className="mb-4 rounded-lg opacity-70" />
                    <p className="text-muted-foreground text-sm">Tools for dividing bills and tracking individual shares will be available soon.</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
