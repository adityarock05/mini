"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { grievancesApi } from "@/lib/api";

const grievanceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  category: z.enum(["INFRASTRUCTURE", "ACADEMICS", "HOSTEL", "FOOD", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  location: z.string().min(3, "Location is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  isAnonymous: z.boolean(),
});

type GrievanceFormData = z.infer<typeof grievanceSchema>;

export default function NewGrievancePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GrievanceFormData>({
    resolver: zodResolver(grievanceSchema),
    defaultValues: {
      category: "OTHER",
      priority: "MEDIUM",
      isAnonymous: false,
    },
  });

  const onSubmit = async (data: GrievanceFormData) => {
    setIsSubmitting(true);
    try {
      await grievancesApi.create({
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        location: data.location,
        is_anonymous: data.isAnonymous,
      });
      toast.success("Grievance submitted successfully!");
      router.push("/grievances");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit grievance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/grievances"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Grievances
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Grievance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("category")}
                >
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                  <option value="ACADEMICS">Academics</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="FOOD">Food</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("priority")}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Where did this occur? (e.g., Hostel Block A, Main Building)"
                {...register("location")}
              />
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={5}
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photos (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isAnonymous"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                {...register("isAnonymous")}
              />
              <Label htmlFor="isAnonymous" className="text-sm cursor-pointer">
                Submit anonymously
              </Label>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Grievance"}
              </Button>
              <Link href="/grievances" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}