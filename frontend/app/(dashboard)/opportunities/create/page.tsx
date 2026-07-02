"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { opportunitiesApi } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";

export default function CreateOpportunityPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "RESEARCH",
        duration: "",
        stipend: "",
        deadline: "",
        skills: [] as string[],
    });
    const [skillInput, setSkillInput] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData((prev) => ({ ...prev, type: value }));
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData((prev) => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
            setSkillInput("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            skills: prev.skills.filter((skill) => skill !== skillToRemove),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description || !formData.duration || !formData.deadline) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (formData.skills.length === 0) {
            toast.error("Please add at least one skill");
            return;
        }

        try {
            setLoading(true);
            await opportunitiesApi.create({
                ...formData,
                stipend: formData.stipend || undefined,
            });
            toast.success("Opportunity created successfully!");
            router.push("/opportunities");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to create opportunity");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Opportunities
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Opportunity</CardTitle>
                    <CardDescription>Post a new research project or internship for students.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g. AI Research Assistant"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Type *</Label>
                            <Select value={formData.type} onValueChange={handleSelectChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RESEARCH">Research Project</SelectItem>
                                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Detailed description of the role and responsibilities..."
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={5}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration *</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    placeholder="e.g. 3 months, 1 semester"
                                    value={formData.duration}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="stipend">Stipend (Optional)</Label>
                                <Input
                                    id="stipend"
                                    name="stipend"
                                    placeholder="e.g. ₹5000/month, Unpaid"
                                    value={formData.stipend}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deadline">Application Deadline *</Label>
                            <Input
                                id="deadline"
                                name="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Required Skills *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    placeholder="Add a skill (e.g. Python, React)"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addSkill();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addSkill} size="icon">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.skills.map((skill) => (
                                    <div key={skill} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                        {skill}
                                        <button type="button" onClick={() => removeSkill(skill)} className="hover:text-destructive">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create Opportunity"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
