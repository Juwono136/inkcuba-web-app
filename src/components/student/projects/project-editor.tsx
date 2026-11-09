"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  Code2,
  Globe,
  GraduationCap,
  Link2,
  Loader2,
  Archive,
  Lock,
  MapPin,
  MoreHorizontal,
  PlayCircle,
  Plus,
  School,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { readApiJson } from "@/lib/api/read-response";
import { PROJECT_DESCRIPTION_MAX_PLAIN, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/limits";

type ProjectPayload = {
  id: string;
  title: string;
  description: string;
  demoUrl: string;
  videoUrl: string;
  sourceUrl: string;
  status: ProjectStatus;
  updatedAt: string;
  kind: "INDIVIDUAL" | "GROUP";
  mode: "prepare" | "library";
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  windowState: "ALWAYS" | "OPEN" | "UPCOMING" | "ENDED" | null;
  submitBlockedReason: string | null;
  isDetached: boolean;
  accessLabel: string;
  relationNote: string | null;
  backHref: string;
  backLabel: string;
  submissionHref: string | null;
  workspaceId: string | null;
  assignmentId: string | null;
  groupId: string | null;
  summary: {
    workspaceName: string | null;
    className: string | null;
    semesterLabel: string | null;
    submissionTitle: string | null;
    lecturerName: string | null;
    campus: string | null;
    major: string | null;
    batch: string | null;
    academicSemester: string | null;
  };
  members: Array<{ userId: string; name: string; nim: string | null; image: string | null }>;
  images: Array<{ id: string; url: string }>;
  video: { id: string; url: string } | null;
  documents: Array<{ id: string; role: "PROJECT" | "ADDITIONAL"; fileName: string; url: string }>;
  links: Array<{ label: string; url: string }>;
};

export function ProjectEditor({
  portfolioId,
  source,
}: {
  portfolioId: string;
  source: "submission" | "lists";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["student-project", portfolioId, source],
    queryFn: async () => {
      const response = await fetch(`/api/student/projects/${portfolioId}?source=${source}`);
      return readApiJson<ProjectPayload>(response, "Unable to load this project");
    },
  });
  const project = query.data;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAddLink, setConfirmAddLink] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    title: string;
    description: string;
    path: string;
    file: File;
    role?: "PROJECT" | "ADDITIONAL";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setTitle(project.title);
    setDescription(project.description);
    setDemoUrl(project.demoUrl);
    setVideoUrl(project.videoUrl);
    setSourceUrl(project.sourceUrl);
    setLinks(project.links);
  }, [project]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["student-project", portfolioId] });
  }

  async function save() {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          demoUrl,
          videoUrl,
          sourceUrl,
          links: links.filter((link) => link.url.trim()),
          expectedUpdatedAt: project.updatedAt,
        }),
      });
      await readApiJson(response, "Unable to save the draft");
      toast.success("Draft saved");
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save the draft";
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await save();
      const response = await fetch(`/api/student/projects/${portfolioId}/submit`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      await readApiJson(response, "Unable to submit the project");
      toast.success("Project submitted");
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to submit the project";
      setError(message);
      toast.error(message);
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}/archive`, { method: "POST" });
      await readApiJson(response, "Unable to archive the project");
      toast.success("Project archived");
      router.push("/dashboard/student/projects");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to archive the project");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function removeProject() {
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}`, { method: "DELETE" });
      await readApiJson(response, "Unable to delete the project");
      toast.success("Project deleted");
      await queryClient.invalidateQueries({ queryKey: ["student-projects"] });
      router.push("/dashboard/student/projects");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to delete the project");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function upload(path: string, file: File, role?: "PROJECT" | "ADDITIONAL") {
    const body = new FormData();
    body.set("file", file);
    if (role) body.set("role", role);
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}/${path}`, {
        method: "POST",
        body,
      });
      await readApiJson(response, "Upload failed");
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Upload failed");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}/${path}`, { method: "DELETE" });
      await readApiJson(response, "Unable to remove the file");
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to remove the file");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  function queueFile(input: {
    title: string;
    description: string;
    path: string;
    file: File;
    role?: "PROJECT" | "ADDITIONAL";
  }) {
    setPendingFile(input);
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <InkcubaLoader label="Loading project…" />
      </div>
    );
  }
  if (query.isError || !project) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {query.error instanceof Error ? query.error.message : "Unable to load this project"}
      </div>
    );
  }

  const locked = !project.canEdit || busy;
  const summary = project.summary;
  const projectDoc = project.documents.find((doc) => doc.role === "PROJECT");
  const extraDocs = project.documents.filter((doc) => doc.role === "ADDITIONAL");
  const isPrepare = project.mode === "prepare";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button type="button" variant="outline" className="w-fit border-slate-900" asChild>
          <Link href={project.backHref}>
            <ArrowLeft className="h-4 w-4" />
            {project.backLabel}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-slate-700 uppercase">
            {project.kind === "GROUP" ? "Group" : "Individual"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {project.accessLabel}
          </span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase shadow-sm ${statusTone(project.status)}`}>
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
      </div>

      {isPrepare ? (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
          You are preparing this project for the live submission. Use <span className="font-semibold">Back</span> to return to the submission detail. Project lists keeps a lasting copy if the workspace or submission is later removed.
        </p>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
          This page is your project record. Edit or delete when allowed.{" "}
          {project.submissionHref ? (
            <>
              The live submission is still available —{" "}
              <Link href={project.submissionHref} className="font-semibold text-sky-700 underline-offset-2 hover:underline">
                open submission detail
              </Link>
              .
            </>
          ) : (
            "The original workspace or submission is no longer available, so this record stays here with its saved details."
          )}
        </p>
      )}

      {project.relationNote ? (
        <p className="flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-950">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          {project.relationNote}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Workspace</p>
        <p className="mt-1 font-heading text-base font-bold break-words text-slate-900 sm:text-lg">
          {summary.workspaceName || "Workspace removed"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
          {[summary.className, summary.semesterLabel, summary.submissionTitle]
            .filter(Boolean)
            .map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                {item}
              </span>
            ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="text-sm font-semibold text-slate-900" htmlFor="project-title">
            Project title
          </label>
          <span className="text-xs text-slate-500">{title.trim().length}/120</span>
        </div>
        <Input
          id="project-title"
          value={title}
          disabled={locked}
          placeholder="Name the project in a few words"
          className="mt-2 h-11 rounded-xl border-slate-300"
          onChange={(event) => setTitle(event.target.value)}
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Required. 3 to 120 characters. Saving asks you to confirm.</p>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
          <h2 className="font-heading text-sm font-bold text-slate-900">Academic information</h2>
          <p className="mt-1 text-xs text-slate-500">Copied from your class and profile when this project was opened.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoTile icon={UserRound} label="Lecturer" value={summary.lecturerName} />
            <InfoTile icon={School} label="Class" value={summary.className} />
            <InfoTile icon={CalendarDays} label="Semester" value={summary.semesterLabel} />
            <InfoTile icon={MapPin} label="Campus" value={summary.campus} />
            <InfoTile icon={GraduationCap} label="Major" value={summary.major} />
            <InfoTile icon={Building2} label="Batch" value={summary.batch} />
            <InfoTile icon={BookOpen} label="Academic semester" value={summary.academicSemester} wide />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
          <h2 className="font-heading text-sm font-bold text-slate-900">
            {project.kind === "GROUP" ? "Group members" : "Student"}
          </h2>
          <ul className="mt-3 space-y-2">
            {project.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <UserAvatar name={member.name} image={member.image} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{member.name}</span>
                  <span className="block text-xs text-slate-500">{member.nim || "Student"}</span>
                </span>
              </li>
            ))}
          </ul>
          {project.kind === "GROUP" ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-950">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This project stays with the group. After prepare starts, only your lecturer can move members.
            </p>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-12">
          <h2 className="font-heading text-sm font-bold text-slate-900">Project overview</h2>
          <p className="mt-1 text-xs text-slate-500">
            1 to 3 images are required. Video is optional. Images stay at their original size up to 4096 px and are compressed for storage.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {project.images.map((image) => (
              <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-28 w-full object-cover" />
                <Button type="button" variant="outline" className="w-full rounded-none border-0" disabled={locked} onClick={() => setPendingRemove(`images/${image.id}`)}>
                  Remove
                </Button>
              </div>
            ))}
            {project.images.length < 3 ? (
              <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600">
                <Upload className="mb-1 h-4 w-4" />
                Add image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/tiff"
                  className="sr-only"
                  disabled={locked}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    queueFile({
                      title: "Add this overview image?",
                      description: `${file.name} will be compressed and stored with the project.`,
                      path: "images",
                      file,
                    });
                  }}
                />
              </label>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {project.video ? (
              <video src={project.video.url} controls className="max-h-40 rounded-xl" />
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <PlayCircle className="h-4 w-4" />
              {project.video ? "Replace video" : "Add video"}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                disabled={locked}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  queueFile({
                    title: project.video ? "Replace the overview video?" : "Add this overview video?",
                    description: project.video
                      ? `${file.name} replaces the current video. The previous file is deleted from storage.`
                      : `${file.name} will be processed and stored. Video needs ffmpeg on the server.`,
                    path: "video",
                    file,
                  });
                }}
              />
            </label>
            {project.video ? (
              <Button type="button" variant="outline" disabled={locked} onClick={() => setPendingRemove("video")}>
                Remove video
              </Button>
            ) : null}
          </div>
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-12">
          <h2 className="font-heading text-sm font-bold text-slate-900">Project submission</h2>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Description</p>
            <WorkspaceRichTextEditor
              value={description}
              onChange={setDescription}
              disabled={locked}
              allowImages={false}
              showCounter
              maxPlainLength={PROJECT_DESCRIPTION_MAX_PLAIN}
              placeholder="Describe the problem, what you built, and how someone should try it."
              ariaLabel="Project description"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <UrlField icon={Globe} label="Demo URL" required value={demoUrl} disabled={locked} placeholder="https://your-demo.example" onChange={setDemoUrl} />
            </div>
            <UrlField icon={PlayCircle} label="Product video URL" value={videoUrl} disabled={locked} placeholder="https://youtube.com/..." onChange={setVideoUrl} />
            <UrlField icon={Code2} label="Source code URL" value={sourceUrl} disabled={locked} placeholder="https://github.com/..." onChange={setSourceUrl} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Other links</p>
              <Button
                type="button"
                variant="outline"
                disabled={locked || links.length >= 3}
                onClick={() => setConfirmAddLink(true)}
              >
                <Plus className="h-4 w-4" />
                Add link
              </Button>
            </div>
            {links.map((link, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
                <Input value={link.label} disabled={locked} placeholder="Label" onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                <Input value={link.url} disabled={locked} placeholder="https://" onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} />
                <Button type="button" variant="outline" disabled={locked} onClick={() => setPendingLink(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <FileSlot
            label="Project documentation"
            required
            hint="One file. PDF, JPG, PNG, EPS, PSD, TIFF, WebP, SVG, or CDR. 20MB max."
            file={projectDoc}
            disabled={locked}
            onUpload={(file) =>
              queueFile({
                title: projectDoc ? "Replace the project documentation?" : "Upload project documentation?",
                description: projectDoc
                  ? `${file.name} replaces the current file. The previous file is deleted from storage.`
                  : `${file.name} will be stored as the required project file.`,
                path: "documents",
                file,
                role: "PROJECT",
              })
            }
            onRemove={projectDoc ? () => setPendingRemove(`documents/${projectDoc.id}`) : undefined}
          />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Additional documentation</p>
            <p className="text-xs text-slate-500">Optional. Up to 3 files, same formats, 20MB each.</p>
            {extraDocs.map((doc) => (
              <FileRow key={doc.id} name={doc.fileName} href={doc.url} disabled={locked} onRemove={() => setPendingRemove(`documents/${doc.id}`)} />
            ))}
            {extraDocs.length < 3 ? (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <Upload className="h-4 w-4" />
                Add file
                <input type="file" className="sr-only" disabled={locked} accept=".pdf,.jpg,.jpeg,.png,.eps,.psd,.tif,.tiff,.webp,.svg,.cdr" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  queueFile({
                    title: "Add this additional file?",
                    description: `${file.name} will be stored with the project.`,
                    path: "documents",
                    file,
                    role: "ADDITIONAL",
                  });
                }} />
              </label>
            ) : null}
          </div>
        </section>
      </div>
      {!project.canSubmit && project.submitBlockedReason && project.canEdit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {project.submitBlockedReason}
        </p>
      ) : null}

      {/* Mobile: sits in normal flow under the form. Large screens: sticks while scrolling. */}
      <div className="relative mt-3 w-full lg:sticky lg:bottom-3 lg:z-20">
        <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:justify-between lg:bg-white/95 lg:p-3 lg:shadow-lg lg:backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            {project.canDelete || project.canArchive ? (
              <>
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 shrink-0 border-slate-300 px-0"
                        disabled={busy}
                        aria-label="More project actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {project.canArchive ? (
                        <DropdownMenuItem
                          disabled={busy}
                          onSelect={() => setConfirmArchive(true)}
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      ) : null}
                      {project.canDelete ? (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busy}
                          onSelect={() => setConfirmDelete(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {project.canDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 border-rose-300 text-rose-700 hover:bg-rose-50"
                      disabled={busy}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </Button>
                  ) : null}
                  {project.canArchive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10"
                      disabled={busy}
                      onClick={() => setConfirmArchive(true)}
                    >
                      Archive
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 min-w-0 flex-1 border-slate-900 lg:min-w-[8.5rem] lg:flex-none"
              disabled={locked}
              onClick={() => setConfirmSave(true)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            {project.canSubmit ? (
              <Button
                type="button"
                size="sm"
                className="h-10 min-w-0 flex-1 bg-inkcuba-cyan hover:bg-sky-600 lg:min-w-[8.5rem] lg:flex-none"
                disabled={locked}
                onClick={() => setConfirmSubmit(true)}
              >
                Submit
              </Button>
            ) : project.canEdit ? (
              <Button
                type="button"
                size="sm"
                className="h-10 min-w-0 flex-1 cursor-not-allowed bg-slate-300 text-slate-600 lg:min-w-[8.5rem] lg:flex-none"
                disabled
                title={project.submitBlockedReason ?? "Submit is not available"}
              >
                Submit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this project?"
        description="After you submit, editing stays closed until a lecturer asks for a revision."
        confirmLabel="Submit project"
        loading={busy}
        onConfirm={submit}
      />
      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save this draft?"
        description="The title, description, and links are stored. Files you already uploaded stay as they are."
        confirmLabel="Save draft"
        loading={busy}
        onConfirm={async () => {
          try {
            await save();
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Unable to save the draft");
            throw caught;
          }
        }}
      />
      <ConfirmDialog
        open={confirmAddLink}
        onOpenChange={setConfirmAddLink}
        title="Add another link?"
        description="You can add up to 3 links. The new row is saved the next time you save the draft."
        confirmLabel="Add link"
        onConfirm={() => {
          setLinks((current) => [...current, { label: "", url: "" }]);
        }}
      />
      <ConfirmDialog
        open={pendingLink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLink(null);
        }}
        title="Remove this link?"
        description="The link is removed from the form. Save the draft to keep that change."
        confirmLabel="Remove link"
        variant="destructive"
        onConfirm={() => {
          if (pendingLink === null) return;
          setLinks((current) => current.filter((_, itemIndex) => itemIndex !== pendingLink));
          setPendingLink(null);
        }}
      />
      <ConfirmDialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFile(null);
        }}
        title={pendingFile?.title ?? "Upload this file?"}
        description={pendingFile?.description ?? "The file will be stored with this project."}
        confirmLabel="Upload"
        loading={busy}
        onConfirm={async () => {
          if (!pendingFile) return;
          await upload(pendingFile.path, pendingFile.file, pendingFile.role);
          setPendingFile(null);
        }}
      />
      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove this file?"
        description="The file is deleted from storage. You can upload another one while the project is still editable."
        confirmLabel="Remove"
        variant="destructive"
        loading={busy}
        onConfirm={async () => {
          if (!pendingRemove) return;
          await remove(pendingRemove);
          setPendingRemove(null);
        }}
      />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this project?"
        description="The project stays in Project lists. Files are not deleted."
        confirmLabel="Archive"
        variant="destructive"
        loading={busy}
        onConfirm={archive}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project permanently?"
        description={
          project.kind === "GROUP"
            ? "This removes the shared project for every contributor and deletes all files from storage. This cannot be undone."
            : "This removes the project and deletes all files from storage. This cannot be undone."
        }
        confirmLabel="Delete project"
        variant="destructive"
        loading={busy}
        onConfirm={removeProject}
      />
    </div>
  );
}

function statusTone(status: ProjectStatus) {
  if (status === "SUBMITTED" || status === "REVISED") return "bg-sky-100 text-sky-800";
  if (status === "IN_REVIEW") return "bg-violet-100 text-violet-800";
  if (status === "NEED_REVISION") return "bg-amber-100 text-amber-900";
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  if (status === "TAKEN_DOWN") return "bg-rose-100 text-rose-800";
  if (status === "ARCHIVED") return "bg-slate-200 text-slate-600";
  return "bg-slate-900 text-white";
}

function InfoTile({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: typeof Globe;
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "Not set"}</p>
    </div>
  );
}

function UrlField({
  icon: Icon,
  label,
  required,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  icon: typeof Globe;
  label: string;
  required?: boolean;
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4" />
        {label}
        {required ? <span className="text-xs font-medium text-slate-500">Required</span> : null}
      </span>
      <Input value={value} disabled={disabled} placeholder={placeholder} className="h-10 rounded-xl" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FileSlot({
  label,
  required,
  hint,
  file,
  disabled,
  onUpload,
  onRemove,
}: {
  label: string;
  required?: boolean;
  hint: string;
  file?: { fileName: string; url: string };
  disabled: boolean;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">
        {label} {required ? <span className="text-xs font-medium text-slate-500">Required</span> : null}
      </p>
      <p className="text-xs text-slate-500">{hint}</p>
      {file ? <FileRow name={file.fileName} href={file.url} disabled={disabled} onRemove={onRemove} /> : null}
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">
        <Link2 className="h-4 w-4" />
        {file ? "Replace file" : "Upload file"}
        <input
          type="file"
          className="sr-only"
          disabled={disabled}
          accept=".pdf,.jpg,.jpeg,.png,.eps,.psd,.tif,.tiff,.webp,.svg,.cdr"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) onUpload(next);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function FileRow({
  name,
  href,
  disabled,
  onRemove,
}: {
  name: string;
  href: string;
  disabled: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <a href={href} className="truncate font-medium text-sky-700" target="_blank" rel="noreferrer">
        {name}
      </a>
      {onRemove ? (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </div>
  );
}
