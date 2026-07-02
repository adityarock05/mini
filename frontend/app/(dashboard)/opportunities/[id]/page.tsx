"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Briefcase,
    Calendar,
    DollarSign,
    Clock,
    MapPin,
    CheckCircle,
    AlertCircle,
    Trash2,
    ArrowLeft,
} from "lucide-react";
import { opportunitiesApi, usersApi } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface Opportunity {
    id: string;
    title: string;
    description: string;
    type: string;
    faculty_id: string;
    faculty_name: string;
    skills: string[];
    duration: string;
    stipend: string | null;
    deadline: string;
    is_open: boolean;
    created_at: string;
    is_applied?: boolean; // Added in backend
    application_status?: string; // Added in backend
}

interface Application {
    id: string;
    student_name: string;
    status: string;
    cover_letter: string;
    applied_at: string;
}

export default function OpportunityDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [coverLetter, setCoverLetter] = useState("");
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [applications, setApplications] = useState<Application[]>([]); // For faculty view

    useEffect(() => {
        fetchUserAndOpportunity();
    }, [resolvedParams.id]);

    const fetchUserAndOpportunity = async () => {
        try {
            setLoading(true);
            // Fetch user info first to know role
            try {
                const user = await usersApi.getMe();
                setUserRole(user.role);
                setUserId(user.id);
            } catch (err) {
                console.error("Failed to fetch user", err);
            }

            // Fetch opportunity details
            const data = await opportunitiesApi.get(resolvedParams.id);
            setOpportunity(data);

            // If faculty and owner, fetch applications
            // Note: We need to check if user needs to fetch applications *after* we know both user and opportunity
            // We will do a separate check or effect, or just do it here if possible.
            // Since setting state is async, we can't rely on userRole immediately if set above.
            // But we can rely on the data we just got.

        } catch (error: any) {
            toast.error("Failed to load opportunity details");
            console.error(error);
            router.push("/opportunities");
        } finally {
            setLoading(false);
        }
    };

    // Separate effect to fetch applications if faculty owner
    useEffect(() => {
        if (userRole === "FACULTY" && opportunity && userId === opportunity.faculty_id) {
            fetchApplications();
        }
    }, [userRole, opportunity, userId]);

    const fetchApplications = async () => {
        try {
            const apps = await opportunitiesApi.getApplications(resolvedParams.id);
            setApplications(apps);
        } catch (error) {
            console.error("Failed to fetch applications", error);
        }
    };

    const handleApply = async () => {
        if (!coverLetter.trim()) {
            toast.error("Please provide a cover letter");
            return;
        }

        try {
            setApplying(true);
            await opportunitiesApi.apply(resolvedParams.id, { cover_letter: coverLetter });
            toast.success("Application submitted successfully!");
            setShowApplyModal(false);
            fetchUserAndOpportunity(); // Refresh to update status
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to submit application");
        } finally {
            setApplying(false);
        }
    };

    const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
        try {
            await opportunitiesApi.updateApplicationStatus(applicationId, { status: newStatus });
            toast.success("Status updated");
            fetchApplications(); // Refresh list
        } catch (error: any) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        try {
            await opportunitiesApi.delete(resolvedParams.id);
            toast.success("Opportunity deleted successfully");
            router.push("/opportunities");
        } catch (error: any) {
            toast.error("Failed to delete opportunity");
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!opportunity) {
        return <div className="p-8 text-center">Opportunity not found</div>;
    }

    const isOwner = userRole === "FACULTY" && userId === opportunity.faculty_id;
    const isStudent = userRole === "STUDENT";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Opportunities
            </Button>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge className="mb-2">{opportunity.type}</Badge>
                                    <CardTitle className="text-2xl">{opportunity.title}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-2">
                                        <Briefcase className="w-4 h-4" />
                                        Posted by Prof. {opportunity.faculty_name}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {opportunity.is_applied && (
                                        <Badge variant={
                                            opportunity.application_status === 'ACCEPTED' ? 'default' :
                                                opportunity.application_status === 'REJECTED' ? 'destructive' : 'secondary'
                                        } className="text-sm px-3 py-1">
                                            {opportunity.application_status || 'Applied'}
                                        </Badge>
                                    )}
                                    {isOwner && (
                                        <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>Duration: {opportunity.duration}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <DollarSign className="w-4 h-4" />
                                    <span>Stipend: {opportunity.stipend || "Unpaid"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Status: {opportunity.is_open ? "Open" : "Closed"}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Description</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Required Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {opportunity.skills.map((skill) => (
                                        <Badge key={skill} variant="outline">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {isStudent && !opportunity.is_applied && opportunity.is_open && (
                                <Button className="w-full mt-4" size="lg" onClick={() => setShowApplyModal(true)}>
                                    Apply Now
                                </Button>
                            )}

                            {isStudent && !opportunity.is_open && !opportunity.is_applied && (
                                <Button className="w-full mt-4" size="lg" disabled variant="secondary">
                                    Applications Closed
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Applications List for Faculty Owner */}
                    {isOwner && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Applications ({applications.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {applications.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No applications yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {applications.map((app) => (
                                            <div key={app.id} className="border rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{app.student_name}</h4>
                                                        <p className="text-xs text-gray-500">Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <Badge variant="outline">{app.status}</Badge>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                                                    <p className="font-medium text-xs text-gray-500 mb-1">Cover Letter:</p>
                                                    {app.cover_letter}
                                                </div>
                                                <div className="flex gap-2 justify-end flex-wrap">
                                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(app.id, "UNDER_REVIEW")}>Under Review</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(app.id, "SHORTLISTED")}>Shortlist</Button>
                                                    <Button size="sm" variant="default" onClick={() => handleStatusUpdate(app.id, "ACCEPTED")}>Accept</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(app.id, "REJECTED")}>Reject</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply for {opportunity.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Cover Letter</label>
                            <Textarea
                                placeholder="Explain why you are a good fit for this opportunity..."
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                rows={6}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowApplyModal(false)}>Cancel</Button>
                            <Button onClick={handleApply} disabled={applying}>
                                {applying ? "Submitting..." : "Submit Application"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Opportunity</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this opportunity? This action cannot be undone and will delete all associated applications.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
