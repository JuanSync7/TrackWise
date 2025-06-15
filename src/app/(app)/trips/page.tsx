
"use client";

import React, { useState, Suspense } from 'react'; // Added React, Suspense
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, PlaneTakeoff, Loader2 } from 'lucide-react'; // Added Loader2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useTrips } from '@/contexts/trip-context'; // Changed to useTrips
import { useToast } from "@/hooks/use-toast";
import type { Trip } from '@/lib/types';
// import { TripForm, type TripFormValues } from '@/components/trips/trip-form'; // Dynamic import
import Link from 'next/link';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

const TripForm = React.lazy(() => import('@/components/trips/trip-form').then(module => ({ default: module.TripForm })));
type TripFormValues = Omit<Trip, 'id' | 'createdAt'>;


export default function TripsPage() {
  const { addTrip, getTrips } = useTrips(); // Changed context
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allTrips = getTrips().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSaveTrip = async (data: TripFormValues) => {
    setIsSubmitting(true);
    try {
      addTrip(data);
      toast({ title: "Trip Created", description: `"${data.name}" has been successfully created.` });
      setIsFormOpen(false);
      setEditingTrip(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFormForNew = () => {
    setEditingTrip(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Your Trips"
        description="Manage your group trips, track shared expenses, and settle up easily."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Trip
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingTrip(undefined);
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrip ? 'Edit Trip' : 'Create New Trip'}</DialogTitle>
            <DialogDescription>
              {editingTrip ? 'Update the details of your trip.' : 'Fill in the details for your new trip.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TripForm
              trip={editingTrip}
              onSave={handleSaveTrip}
              onCancel={() => { setIsFormOpen(false); setEditingTrip(undefined); }}
              isSubmitting={isSubmitting}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {allTrips.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
          <PlaneTakeoff className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Trips Yet</h3>
          <p className="text-muted-foreground">Click "Create New Trip" to start planning your next adventure!</p>
          
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <AnimatePresence>
          {allTrips.map(trip => (
            <motion.div
              key={trip.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-primary">{trip.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Created: {format(new Date(trip.createdAt), 'PP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {trip.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href={`/trips/${trip.id}`} passHref className="w-full">
                    <Button className="w-full">
                      <PlaneTakeoff className="mr-2 h-4 w-4" /> Manage Trip
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

