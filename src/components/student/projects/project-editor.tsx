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
  ArchiveRestore,
  ImagePlus,
  Lock,
  MapPin,
  MoreHorizontal,
  PlayCircle,
  Plus,
  RefreshCw,
  School,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { ProjectHistoryButton } from "@/components/projects/project-history-modal";
import { ProjectJourneyTimeline } from "@/components/projects/project-journey-timeline";
import { ProjectAssessmentPanel } from "@/components/projects/project-assessment-panel";
import type { ProjectScoringSheetData } from "@/components/projects/project-scoring-sheet";
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
import { useUnsavedChangesGuard, type UnsavedLeaveTarget } from "@/hooks/use-unsaved-changes-guard";
import { readApiJson } from "@/lib/api/read-response";
import { cn } from "@/lib/utils";
import {
  PROJECT_DESCRIPTION_MAX_PLAIN,
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_STATUS_LABELS,
  PROJECT_VIDEO_MAX_BYTES,
  PROJECT_VIDEO_MAX_SECONDS,
  type ProjectStatus,
} from "@/lib/projects/limits";

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
  canUnarchive: boolean;
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
  grade: number | null;
  feedback: string | null;
  maxScore: number | null;
  viewerFinalGrade: number | null;
  rubric: Array<{
    id: string;
    name: string;
    description: string | null;
    weightPercent: number;
    maxPoints: number;
  }>;
  scoreSheet: ProjectScoringSheetData | null;
  revisionPolicy: {
    maxRevisions: number;
    revisionCount: number;
    canRequestRevision: boolean;
    remainingRevisions: number;
  };
  journey: {
    hasRevisionHistory: boolean;
    hasResubmitted: boolean;
    stageTimestamps?: Partial<
      Record<
        "draft" | "submitted" | "in_review" | "revision" | "resubmitted" | "published" | "archived",
        string | null
      >
    >;
  };
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
  video: { id: string; url: string; durationSeconds: number | null; size: number | null } | null;
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
  const [confirmUnarchive, setConfirmUnarchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAddLink, setConfirmAddLink] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<UnsavedLeaveTarget | null>(null);
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
  const hydratedKey = useRef<string | null>(null);
  const skipNextHydrate = useRef(false);

  const formSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        description,
        demoUrl: demoUrl.trim(),
        videoUrl: videoUrl.trim(),
        sourceUrl: sourceUrl.trim(),
        links: links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      }),
    [title, description, demoUrl, videoUrl, sourceUrl, links],
  );

  const serverSnapshot = useMemo(() => {
    if (!project) return null;
    return JSON.stringify({
      title: project.title.trim(),
      description: project.description,
      demoUrl: (project.demoUrl ?? "").trim(),
      videoUrl: (project.videoUrl ?? "").trim(),
      sourceUrl: (project.sourceUrl ?? "").trim(),
      links: (project.links ?? []).map((link) => ({
        label: (link.label ?? "").trim(),
        url: (link.url ?? "").trim(),
      })),
    });
  }, [project]);

  const isDirty = Boolean(project?.canEdit && serverSnapshot && formSnapshot !== serverSnapshot);

  const { allowNextNavigation } = useUnsavedChangesGuard({
    enabled: isDirty,
    onBlock: (target) => {
      setPendingLeave(target);
      setConfirmLeave(true);
    },
  });

  useEffect(() => {
    if (!project) return;
    const key = `${project.id}:${project.updatedAt}`;
    if (skipNextHydrate.current) {
      skipNextHydrate.current = false;
      hydratedKey.current = key;
      return;
    }
    if (hydratedKey.current === key) return;
    if (isDirty && hydratedKey.current?.startsWith(`${project.id}:`)) return;
    setTitle(project.title);
    setDescription(project.description);
    setDemoUrl(project.demoUrl ?? "");
    setVideoUrl(project.videoUrl ?? "");
    setSourceUrl(project.sourceUrl ?? "");
    setLinks(project.links ?? []);
    hydratedKey.current = key;
  }, [project, isDirty]);

  async function refresh(options?: { preserveForm?: boolean }) {
    if (options?.preserveForm) skipNextHydrate.current = true;
    await queryClient.invalidateQueries({ queryKey: ["student-project", portfolioId] });
  }

  async function save(options?: { quiet?: boolean }) {
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
      const saved = await readApiJson<ProjectPayload>(response, "Unable to save the draft");
      skipNextHydrate.current = true;
      hydratedKey.current = `${saved.id}:${saved.updatedAt}`;
      queryClient.setQueryData(["student-project", portfolioId, source], saved);
      setTitle(saved.title);
      setDescription(saved.description);
      setDemoUrl(saved.demoUrl ?? "");
      setVideoUrl(saved.videoUrl ?? "");
      setSourceUrl(saved.sourceUrl ?? "");
      setLinks(saved.links ?? []);
      if (!options?.quiet) toast.success("Draft saved");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save the draft";
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }

  function requestLeave(href: string) {
    if (!isDirty) {
      allowNextNavigation();
      router.push(href);
      return;
    }
    setPendingLeave({ type: "href", href });
    setConfirmLeave(true);
  }

  function confirmLeavePage() {
    const target = pendingLeave;
    setPendingLeave(null);
    setConfirmLeave(false);
    allowNextNavigation();
    if (!target) return;
    if (target.type === "href") {
      router.push(target.href);
      return;
    }
    // Browser Back: land on the same destination as the in-app Back control.
    if (project?.backHref) {
      router.push(project.backHref);
      return;
    }
    window.history.go(-2);
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
      allowNextNavigation();
      router.push("/dashboard/student/projects");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to archive the project");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function unarchive() {
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}/unarchive`, { method: "POST" });
      const result = await readApiJson<{ status: ProjectStatus }>(response, "Unable to restore the project");
      toast.success(
        result.status === "NEED_REVISION"
          ? "Project restored — you can revise again"
          : "Project restored to draft",
      );
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["student-projects"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to restore the project");
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
      allowNextNavigation();
      router.push("/dashboard/student/projects");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to delete the project");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function upload(path: string, file: File, role?: "PROJECT" | "ADDITIONAL") {
    if (isDirty) {
      try {
        await save({ quiet: true });
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Save your links and title before uploading files",
        );
        throw caught;
      }
    }
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
      toast.success("File uploaded");
      await refresh({ preserveForm: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Upload failed");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    if (isDirty) {
      try {
        await save({ quiet: true });
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : "Save your draft before removing files",
        );
        throw caught;
      }
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${portfolioId}/${path}`, { method: "DELETE" });
      await readApiJson(response, "Unable to remove the file");
      toast.success("File removed");
      await refresh({ preserveForm: true });
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
    const isImagePath = input.path === "images" || input.path.startsWith("images/");
    const maxBytes =
      input.path === "video"
        ? PROJECT_VIDEO_MAX_BYTES
        : isImagePath
          ? PROJECT_IMAGE_MAX_BYTES
          : PROJECT_DOCUMENT_MAX_BYTES;
    if (input.file.size > maxBytes) {
      const label = input.path === "video" ? "100MB" : isImagePath ? "12MB" : "20MB";
      toast.error(`That file is too large. Keep it under ${label}.`);
      return;
    }
    setPendingFile(input);
  }

  const removeCopy = useMemo(() => {
    if (!pendingRemove) {
      return {
        title: "Remove this file?",
        description: "The file is deleted from storage. You can upload another one while the project is still editable.",
        confirmLabel: "Remove",
      };
    }
    if (pendingRemove === "video") {
      return {
        title: "Remove overview video?",
        description:
          "The video is removed from this project and deleted from storage. You can add a new one while editing is open.",
        confirmLabel: "Remove video",
      };
    }
    if (pendingRemove.startsWith("images/")) {
      return {
        title: "Remove this overview image?",
        description:
          "The image is removed from the project and deleted from storage. Keep at least one image before you submit.",
        confirmLabel: "Remove image",
      };
    }
    return {
      title: "Remove this document?",
      description:
        "The file is removed from the project and deleted from storage. You can upload another file while editing is open.",
      confirmLabel: "Remove file",
    };
  }, [pendingRemove]);

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
  const submitHints = [
    title.trim().length < 3 ? "Add a project title (at least 3 characters)." : null,
    !description || description.replace(/<[^>]+>/g, "").trim().length < 1
      ? "Add a project description."
      : null,
    !demoUrl.trim() ? "Add a demo URL." : null,
    project.images.length < 1 ? "Add at least one overview image." : null,
    !projectDoc ? "Upload project documentation." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {busy ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/25 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-slate-900 bg-white px-6 py-5 shadow-xl">
            <InkcubaLoader label="Working on your project…" />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="w-full border-slate-900 sm:w-fit"
          onClick={() => requestLeave(project.backHref)}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{project.backLabel}</span>
        </Button>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-slate-700 uppercase">
            {project.kind === "GROUP" ? "Group" : "Individual"}
          </span>
          <span className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {project.accessLabel}
          </span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase shadow-sm ${statusTone(project.status)}`}>
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </span>
          <ProjectHistoryButton
            href={`/api/student/projects/${portfolioId}/events`}
            queryKey={["student-project-events", portfolioId]}
          />
        </div>
      </div>

      <ProjectJourneyTimeline
        status={project.status}
        hasRevisionHistory={project.journey?.hasRevisionHistory}
        hasResubmitted={project.journey?.hasResubmitted}
        stageTimestamps={project.journey?.stageTimestamps}
      />

      {project.revisionPolicy ? (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
            project.revisionPolicy.remainingRevisions === 0
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          Revision rounds used{" "}
          <span className="font-semibold">
            {project.revisionPolicy.revisionCount}/{project.revisionPolicy.maxRevisions}
          </span>
          .{" "}
          {project.revisionPolicy.remainingRevisions === 0
            ? "No further revision requests are allowed. After you resubmit (if still in revision), the lecturer must publish a final score."
            : `${project.revisionPolicy.remainingRevisions} revision ${
                project.revisionPolicy.remainingRevisions === 1 ? "round remains" : "rounds remain"
              } before the lecturer must publish.`}
        </p>
      ) : null}

      {project.maxScore != null &&
      ((project.rubric && project.rubric.length > 0) || project.scoreSheet) ? (
        <ProjectAssessmentPanel
          rubric={project.rubric ?? []}
          maxScore={project.maxScore}
          scoreSheet={project.scoreSheet}
          defaultTab={
            project.scoreSheet?.decision === "PUBLISH" || project.status === "PUBLISHED"
              ? "results"
              : project.scoreSheet
                ? "results"
                : "rubric"
          }
        />
      ) : null}

      {project.status === "SUBMITTED" ||
      project.status === "IN_REVIEW" ||
      project.status === "REVISED" ? (
        <section className="min-w-0 rounded-2xl border-2 border-violet-700 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-3 py-4 shadow-sm sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300 bg-violet-100 text-violet-800">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-heading text-base font-bold break-words text-violet-950 sm:text-lg">
                {project.status === "IN_REVIEW"
                  ? "Locked — lecturer is reviewing"
                  : "Locked — waiting for lecturer moderation"}
              </p>
              <p className="mt-1 text-sm leading-relaxed break-words text-violet-900/90">
                Edit, archive, and delete stay closed for every group member while scoring is in progress. You will get
                an email when the lecturer requests a revision or publishes the project.
              </p>
              <div className="mt-3 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center border-violet-700 bg-white sm:w-auto"
                  onClick={() => requestLeave(project.backHref)}
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">{project.backLabel}</span>
                </Button>
                {project.submissionHref ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center border-slate-300 sm:w-auto"
                    onClick={() => requestLeave(project.submissionHref!)}
                  >
                    Open submission detail
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : project.status === "NEED_REVISION" ? (
        <section className="rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950 sm:px-5">
          <p className="font-heading text-base font-bold">Revision requested</p>
          {project.revisionPolicy ? (
            <p className="mt-1 text-xs font-medium">
              Round {project.revisionPolicy.revisionCount} of{" "}
              {project.revisionPolicy.maxRevisions}
              {project.revisionPolicy.remainingRevisions === 0
                ? " — this is the final revision round. After you resubmit, the lecturer must publish."
                : "."}
            </p>
          ) : null}
          {project.feedback ? (
            <div
              className="inkcuba-rich-text-content mt-2 text-sm"
              dangerouslySetInnerHTML={{ __html: project.feedback }}
            />
          ) : (
            <p className="mt-1">Your lecturer asked for changes.</p>
          )}
          {project.canEdit ? (
            <p className="mt-2 text-xs">Update the project and submit again before the submission deadline. Group moves are available again during revision.</p>
          ) : (
            <p className="mt-2 text-xs">The submission window has ended, so revision and resubmit are closed.</p>
          )}
        </section>
      ) : project.status === "PUBLISHED" ? (
        <section className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-4 text-sm leading-relaxed text-emerald-950 sm:px-5">
          <p className="font-heading text-base font-bold">Published and verified</p>
          {(project.viewerFinalGrade ?? project.grade) != null && project.maxScore != null ? (
            <p className="mt-1 font-medium">
              Score: {project.viewerFinalGrade ?? project.grade}/{project.maxScore}
            </p>
          ) : null}
          {project.feedback ? (
            <div
              className="inkcuba-rich-text-content mt-2 text-sm"
              dangerouslySetInnerHTML={{ __html: project.feedback }}
            />
          ) : (
            <p className="mt-1 text-xs">No additional lecturer note.</p>
          )}
        </section>
      ) : (
        <div className="space-y-3">
          {isPrepare ? (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
              You are preparing this project for the live submission. Use{" "}
              <span className="font-semibold">Back</span> to return to the submission detail. Project lists keeps a
              lasting copy if the workspace or submission is later removed.
            </p>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
              This page is your project record. Edit or delete when allowed.{" "}
              {project.submissionHref ? (
                <>
                  The live submission is still available —{" "}
                  <button
                    type="button"
                    className="cursor-pointer font-semibold text-sky-700 underline-offset-2 hover:underline"
                    onClick={() => requestLeave(project.submissionHref!)}
                  >
                    open submission detail
                  </button>
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
        </div>
      )}

      <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Workspace</p>
        <p className="mt-1 font-heading text-base font-bold break-words text-slate-900 sm:text-lg">
          {summary.workspaceName || "Workspace removed"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
          {[summary.className, summary.semesterLabel, summary.submissionTitle]
            .filter(Boolean)
            .map((item) => (
              <span
                key={item}
                className="max-w-full break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium"
              >
                {item}
              </span>
            ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700">{error}</p>
      ) : null}

      <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
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
          className="mt-2 h-11 w-full min-w-0 max-w-full rounded-xl border-slate-300"
          onChange={(event) => setTitle(event.target.value)}
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Required. 3 to 120 characters. Saving asks you to confirm.</p>
      </section>

      <div className="grid min-w-0 max-w-full grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-7">
          <h2 className="font-heading text-sm font-bold text-slate-900">Academic information</h2>
          <p className="mt-1 text-xs text-slate-500">Copied from your class and profile when this project was opened.</p>
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoTile icon={UserRound} label="Lecturer" value={summary.lecturerName} />
            <InfoTile icon={School} label="Class" value={summary.className} />
            <InfoTile icon={CalendarDays} label="Semester" value={summary.semesterLabel} />
            <InfoTile icon={MapPin} label="Campus" value={summary.campus} />
            <InfoTile icon={GraduationCap} label="Major" value={summary.major} />
            <InfoTile icon={Building2} label="Batch" value={summary.batch} />
            <InfoTile icon={BookOpen} label="Academic semester" value={summary.academicSemester} wide />
          </div>
        </section>
        <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-5">
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
        <section className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:col-span-12">
          <h2 className="font-heading text-sm font-bold text-slate-900">Project overview</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Add 1–3 images (required for submit). An overview video is optional. Files are compressed, stored in object storage, and replaced or removed without leaving duplicates.
          </p>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">Images</p>
              <p className="text-xs text-slate-500">{project.images.length}/3</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-slate-950/80 via-slate-950/55 to-transparent px-3 pt-8 pb-2.5">
                    <span className="text-[11px] font-semibold text-white">
                      {index === 0 ? "Cover" : `Image ${index + 1}`}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <label
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/40 bg-white/95 px-2.5 text-xs font-medium text-slate-900 transition hover:bg-white ${locked ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Replace
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
                              title: "Replace this overview image?",
                              description: `${file.name} replaces the current image. After a successful upload, the previous file is deleted from storage.`,
                              path: `images/${image.id}`,
                              file,
                            });
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-rose-200/80 bg-white/95 text-rose-700 hover:bg-rose-50"
                        disabled={locked}
                        onClick={() => setPendingRemove(`images/${image.id}`)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {project.images.length < 3 ? (
                <label
                  className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-4 text-center text-sm text-slate-600 transition hover:border-sky-400 hover:bg-sky-50/50 ${locked ? "pointer-events-none opacity-60" : ""}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                    <ImagePlus className="h-4 w-4 text-sky-700" />
                  </span>
                  <span className="font-semibold text-slate-800">Add image</span>
                  <span className="text-xs text-slate-500">JPG, PNG, WebP, TIFF · max 12MB</span>
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
                        description: `${file.name} will be compressed and stored with the project. Removing it later also deletes the file from storage.`,
                        path: "images",
                        file,
                      });
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">Overview video</p>
                <p className="mt-1 text-xs text-slate-500">
                  Optional · MP4, WebM, or MOV · max {Math.floor(PROJECT_VIDEO_MAX_SECONDS / 60)} minutes · 100MB
                </p>
              </div>
              {project.video ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  Stored
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  Not added
                </span>
              )}
            </div>

            {project.video ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12.5rem]">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
                  <video
                    key={project.video.url}
                    src={project.video.url}
                    controls
                    preload="metadata"
                    className="aspect-video max-h-72 w-full bg-black object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">Length:</span>{" "}
                      {formatDuration(project.video.durationSeconds)}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-800">Size:</span>{" "}
                      {formatBytes(project.video.size)}
                    </p>
                  </div>
                  <label
                    className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-900 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 ${locked ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Replace video
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
                          title: "Replace the overview video?",
                          description: `${file.name} replaces the current video. After a successful upload, the previous file is deleted from storage so nothing is left duplicated.`,
                          path: "video",
                          file,
                        });
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-rose-200 text-rose-700 hover:bg-rose-50"
                    disabled={locked}
                    onClick={() => setPendingRemove("video")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove video
                  </Button>
                </div>
              </div>
            ) : (
              <label
                className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center transition hover:border-sky-400 hover:bg-sky-50/40 ${locked ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                  <PlayCircle className="h-5 w-5 text-sky-700" />
                </span>
                <span className="text-sm font-semibold text-slate-900">Add overview video</span>
                <span className="max-w-sm text-xs leading-relaxed text-slate-500">
                  We check the length, compress to MP4, and store one file. Replace or remove later updates storage too.
                </span>
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
                      title: "Add this overview video?",
                      description: `${file.name} will be checked for length, compressed to MP4, and stored (MP4, WebM, or MOV · max 3 minutes · 100MB).`,
                      path: "video",
                      file,
                    });
                  }}
                />
              </label>
            )}
          </div>
        </section>
        <section className="min-w-0 max-w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:col-span-12">
          <h2 className="font-heading text-sm font-bold text-slate-900">Project submission</h2>
          <div className="min-w-0">
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
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="min-w-0 md:col-span-2">
              <UrlField icon={Globe} label="Demo URL" required value={demoUrl} disabled={locked} placeholder="https://your-demo.example" onChange={setDemoUrl} />
            </div>
            <div className="min-w-0">
              <UrlField icon={PlayCircle} label="Product video URL" value={videoUrl} disabled={locked} placeholder="https://youtube.com/..." onChange={setVideoUrl} />
            </div>
            <div className="min-w-0">
              <UrlField icon={Code2} label="Source code URL" value={sourceUrl} disabled={locked} placeholder="https://github.com/..." onChange={setSourceUrl} />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              <div key={index} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]">
                <Input value={link.label} disabled={locked} placeholder="Label" className="min-w-0" onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                <Input value={link.url} disabled={locked} placeholder="https://" className="min-w-0" onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} />
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
      {project.canEdit || project.canArchive || project.canUnarchive ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-900">Save draft vs Archive</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            <li>
              <span className="font-semibold">Save draft</span> stores title, description, and links while the project
              stays editable. It does not change status and does not affect the live submission board.
            </li>
            <li>
              <span className="font-semibold">Archive</span> shelves a draft or revision as read-only on Project lists.
              Files stay in storage. Use <span className="font-semibold">Restore</span> to bring it back. Submitted or
              in-review projects cannot be archived.
            </li>
          </ul>
        </div>
      ) : null}
      {!project.canSubmit && project.submitBlockedReason && project.canEdit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {project.submitBlockedReason}
        </p>
      ) : null}
      {project.canSubmit && submitHints.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Finish these before submit</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {submitHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Mobile: sits in normal flow under the form. Large screens: sticks while scrolling. */}
      <div className="relative mt-3 w-full lg:sticky lg:bottom-3 lg:z-20">
        {!project.canEdit ? (
          <div
            role="status"
            className="flex w-full min-w-0 max-w-full items-start gap-3 rounded-2xl border-2 border-violet-700 bg-violet-50 px-3 py-3 shadow-sm sm:items-center sm:px-4 sm:py-3.5 lg:bg-violet-50/95 lg:shadow-lg lg:backdrop-blur"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300 bg-violet-100 text-violet-900">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-heading text-sm font-bold break-words text-violet-950 sm:text-base">
                {project.status === "SUBMITTED" ||
                project.status === "IN_REVIEW" ||
                project.status === "REVISED"
                  ? "Locked during lecturer moderation"
                  : project.status === "PUBLISHED"
                    ? "Published — read-only"
                    : "This project is read-only"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed break-words text-violet-900/90 sm:text-sm">
                {project.status === "SUBMITTED" ||
                project.status === "IN_REVIEW" ||
                project.status === "REVISED"
                  ? "Edit, archive, and delete stay unavailable until your lecturer requests a revision or publishes the project."
                  : project.status === "PUBLISHED"
                    ? "This verified project cannot be edited, archived, or deleted."
                    : "Editing is closed for this project right now."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:bg-white/95 lg:p-3 lg:shadow-lg lg:backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              {project.canDelete || project.canArchive || project.canUnarchive ? (
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
                        {project.canUnarchive ? (
                          <DropdownMenuItem
                            disabled={busy}
                            onSelect={() => setConfirmUnarchive(true)}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : null}
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
                    {project.canUnarchive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        disabled={busy}
                        onClick={() => setConfirmUnarchive(true)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Restore
                      </Button>
                    ) : null}
                    {project.canArchive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10"
                        disabled={busy}
                        title="Shelve this draft or revision as read-only. Use Restore later to continue."
                        onClick={() => setConfirmArchive(true)}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-w-0 flex-1 border-slate-900 sm:flex-none sm:min-w-[8.5rem]"
                disabled={locked}
                title="Save title, description, and links without changing status"
                onClick={() => setConfirmSave(true)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save draft
              </Button>
              {project.canSubmit ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-10 min-w-0 flex-1 bg-inkcuba-cyan hover:bg-sky-600 sm:flex-none sm:min-w-[8.5rem]"
                  disabled={locked || submitHints.length > 0}
                  title={submitHints[0] ?? "Submit project"}
                  onClick={() => setConfirmSubmit(true)}
                >
                  Submit
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-10 min-w-0 flex-1 cursor-not-allowed bg-slate-300 text-slate-600 sm:flex-none sm:min-w-[8.5rem]"
                  disabled
                  title={project.submitBlockedReason ?? "Submit is not available"}
                >
                  Submit
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={(open) => {
          setConfirmLeave(open);
          if (!open) setPendingLeave(null);
        }}
        title="Leave without saving?"
        description="You have unsaved changes to the title, description, or links. Leave anyway, or cancel and save your draft first."
        confirmLabel="Leave page"
        loading={busy}
        onConfirm={async () => {
          confirmLeavePage();
        }}
      />
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
        description="Stores the title, description, and links only. Status stays the same, the project remains editable, and uploaded files are unchanged. This is not Archive."
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
        title={removeCopy.title}
        description={removeCopy.description}
        confirmLabel={removeCopy.confirmLabel}
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
        description="Archive shelves a draft or revision as read-only on Project lists. Files stay in storage. This is different from Save draft, which only stores your latest edits while keeping the project editable. You can Restore later."
        confirmLabel="Archive project"
        variant="destructive"
        loading={busy}
        onConfirm={archive}
      />
      <ConfirmDialog
        open={confirmUnarchive}
        onOpenChange={setConfirmUnarchive}
        title="Restore this project?"
        description="The project returns to an editable status (draft, or revision if the submission window is still open). Files already in storage stay attached."
        confirmLabel="Restore project"
        loading={busy}
        onConfirm={unarchive}
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
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 ${wide ? "sm:col-span-2" : ""}`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold break-words text-slate-900">{value || "Not set"}</p>
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
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm transition hover:border-slate-500 hover:bg-slate-50">
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
    <div className="mt-2 flex min-w-0 max-w-full flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <a
        href={href}
        className="min-w-0 flex-1 break-all font-medium text-sky-700 underline-offset-2 hover:underline sm:truncate sm:break-normal"
        target="_blank"
        rel="noreferrer"
      >
        {name}
      </a>
      {onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 sm:w-auto"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      ) : null}
    </div>
  );
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
