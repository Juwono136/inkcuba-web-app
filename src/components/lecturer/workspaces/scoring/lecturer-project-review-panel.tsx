"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlignLeft,
  BookOpen,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  MessageSquareWarning,
  PlayCircle,
  RotateCcw,
  School,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { ProjectHistoryButton } from "@/components/projects/project-history-modal";
import { ProjectJourneyTimeline } from "@/components/projects/project-journey-timeline";
import { ProjectAssessmentPanel } from "@/components/projects/project-assessment-panel";
import type { ProjectScoringSheetData } from "@/components/projects/project-scoring-sheet";
import {
  isRubricScoresComplete,
  RubricScoreInputs,
  sumRubricScores,
} from "@/components/lecturer/workspaces/scoring/rubric-score-inputs";
import { ProfilePhotoLightbox } from "@/components/profile/profile-photo-lightbox";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { readApiJson } from "@/lib/api/read-response";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import {
  PROJECT_FEEDBACK_MAX,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/limits";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import { cn } from "@/lib/utils";

type JourneyStageKey =
  | "draft"
  | "submitted"
  | "in_review"
  | "revision"
  | "resubmitted"
  | "published"
  | "archived";

type ReviewDetail = {
  id: string;
  title: string;
  description: string;
  demoUrl: string;
  videoUrl: string;
  sourceUrl: string;
  status: ProjectStatus;
  grade: number | null;
  feedback: string | null;
  updatedAt: string;
  maxScore: number;
  canModerate: boolean;
  submissionType: "INDIVIDUAL" | "GROUP";
  rubric: Array<{
    id: string;
    name: string;
    description: string | null;
    weightPercent: number;
    maxPoints: number;
  }>;
  scoreSheet: (ProjectScoringSheetData & { id?: string }) | null;
  neighbors: { previousId: string | null; nextId: string | null };
  journey: {
    hasRevisionHistory: boolean;
    hasResubmitted: boolean;
    stageTimestamps?: Partial<Record<JourneyStageKey, string | null>>;
  };
  revisionPolicy?: {
    maxRevisions: number;
    revisionCount: number;
    canRequestRevision: boolean;
    remainingRevisions: number;
  };
  summary: {
    workspaceName: string | null;
    className: string | null;
    semesterLabel: string | null;
    submissionTitle: string | null;
  };
  members: Array<{ userId: string; name: string; nim: string | null; image: string | null }>;
  images: Array<{ id: string; url: string }>;
  video: { id: string; url: string } | null;
  documents: Array<{ id: string; role: string; fileName: string; url: string }>;
  links: Array<{ label: string; url: string }>;
};

export function LecturerProjectReviewPanel({
  workspaceId,
  portfolioId,
  onDone,
  onNavigateProject,
}: {
  workspaceId: string;
  portfolioId: string;
  onDone?: () => void;
  onNavigateProject?: (projectId: string) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["lecturer-project-detail", workspaceId, portfolioId],
    queryFn: async () => {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/projects/${portfolioId}`,
      );
      return readApiJson<ReviewDetail>(response, "Unable to load this project");
    },
  });

  const project = query.data;
  const projectHydrateKey = project ? `${project.id}:${project.updatedAt}` : "";
  const [hydrateKey, setHydrateKey] = useState(projectHydrateKey);
  const [decision, setDecision] = useState<"PUBLISH" | "REVISION">("PUBLISH");
  const [componentScores, setComponentScores] = useState<Record<string, string>>({});
  const [groupModeSplit, setGroupModeSplit] = useState(false);
  const [groupPercent, setGroupPercent] = useState("70");
  const [memberComponentScores, setMemberComponentScores] = useState<
    Record<string, Record<string, string>>
  >({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  // Reset draft scoring fields when the loaded project identity/version changes
  // (React “adjust state when props change” pattern — avoids sync setState-in-effect).
  if (project && projectHydrateKey !== hydrateKey) {
    const sheet = project.scoreSheet;
    const nextComponents: Record<string, string> = {};
    project.rubric.forEach((row, index) => {
      const match =
        sheet?.components.find((item) => item.name === row.name) ?? sheet?.components[index];
      nextComponents[row.id] = match ? String(match.score) : "";
    });
    const split =
      project.submissionType === "GROUP" && sheet?.scoringMode === "GROUP_AND_INDIVIDUAL";
    const nextMembers: Record<string, Record<string, string>> = {};
    for (const member of project.members) {
      const prior = sheet?.members.find((item) => item.userId === member.userId);
      const scores: Record<string, string> = {};
      project.rubric.forEach((row, index) => {
        const match =
          prior?.components?.find((item) => item.name === row.name) ??
          prior?.components?.[index];
        scores[row.id] = match ? String(match.score) : "";
      });
      nextMembers[member.userId] = scores;
    }
    setHydrateKey(projectHydrateKey);
    setComponentScores(nextComponents);
    setGroupModeSplit(split);
    setGroupPercent(split && sheet ? String(Math.round(sheet.groupPercent)) : "70");
    setMemberComponentScores(nextMembers);
    setFeedback(project.feedback ?? "");
    setDecision(
      project.status === "NEED_REVISION" && project.revisionPolicy?.canRequestRevision !== false
        ? "REVISION"
        : "PUBLISH",
    );
    setFieldError(null);
    setActiveMemberId(project.members[0]?.userId ?? null);
  }

  const feedbackPlainLength = useMemo(() => plainTextFromHtml(feedback).length, [feedback]);

  const isGroup = project?.submissionType === "GROUP";
  const isSplit = isGroup && groupModeSplit;
  const scoringMode: "INDIVIDUAL" | "GROUP_ONLY" | "GROUP_AND_INDIVIDUAL" = !isGroup
    ? "INDIVIDUAL"
    : isSplit
      ? "GROUP_AND_INDIVIDUAL"
      : "GROUP_ONLY";
  const revisionPolicy = project?.revisionPolicy;
  const revisionBlocked = revisionPolicy ? !revisionPolicy.canRequestRevision : false;
  const isRevision = decision === "REVISION";
  const groupPct = Math.min(100, Math.max(0, Number(groupPercent) || 0));
  const individualPct = 100 - groupPct;
  const componentTotal = useMemo(
    () => sumRubricScores(project?.rubric ?? [], componentScores),
    [project?.rubric, componentScores],
  );

  async function submitDecision() {
    if (!project) return;
    setFieldError(null);
    const plain = plainTextFromHtml(feedback);
    if (decision === "REVISION" && plain.length < 1) {
      setFieldError("Feedback is required when you request a revision");
      throw new Error("Feedback is required when you request a revision");
    }
    if (plain.length > PROJECT_FEEDBACK_MAX) {
      setFieldError(`Feedback must be at most ${PROJECT_FEEDBACK_MAX} characters, not counting formatting`);
      throw new Error(`Feedback must be at most ${PROJECT_FEEDBACK_MAX} characters, not counting formatting`);
    }
    const fail = (message: string): never => {
      setFieldError(message);
      throw new Error(message);
    };

    let payload: Record<string, unknown>;
    if (decision === "REVISION") {
      if (revisionBlocked) {
        fail(
          "The revision limit has been reached. Publish this project with a score instead of requesting another revision.",
        );
      }
      // Revision = feedback only. No scores are sent.
      payload = {
        decision,
        feedback: feedback.trim(),
        expectedUpdatedAt: project.updatedAt,
      };
    } else {
      if (project.rubric.length === 0) fail("This submission has no rubric components to score");
      const componentPayload = project.rubric.map((row) => {
        const raw = componentScores[row.id] ?? "";
        const score = Number(raw);
        if (raw.trim() === "" || !Number.isInteger(score) || score < 0 || score > row.maxPoints) {
          return fail(`Enter a whole-number score from 0 to ${row.maxPoints} for "${row.name}"`);
        }
        return { rubricComponentId: row.id, score };
      });
      const total = componentPayload.reduce((sum, item) => sum + item.score, 0);
      if (total > project.maxScore) {
        fail(`Rubric total ${total} exceeds the maximum score of ${project.maxScore}`);
      }
      let memberPayload: Array<{
        userId: string;
        componentScores: Array<{ rubricComponentId: string; score: number }>;
      }> = [];
      if (isSplit) {
        memberPayload = project.members.map((member) => {
          const scores = memberComponentScores[member.userId] ?? {};
          const componentScoresForMember = project.rubric.map((row) => {
            const raw = scores[row.id] ?? "";
            const score = Number(raw);
            if (raw.trim() === "" || !Number.isInteger(score) || score < 0 || score > row.maxPoints) {
              return fail(
                `Enter a whole-number score from 0 to ${row.maxPoints} for "${row.name}" (${member.name})`,
              );
            }
            return { rubricComponentId: row.id, score };
          });
          const memberTotal = componentScoresForMember.reduce((sum, item) => sum + item.score, 0);
          if (memberTotal > project.maxScore) {
            fail(
              `Individual rubric total for ${member.name} (${memberTotal}) exceeds ${project.maxScore}`,
            );
          }
          return { userId: member.userId, componentScores: componentScoresForMember };
        });
      }
      payload = {
        decision,
        feedback: feedback.trim(),
        expectedUpdatedAt: project.updatedAt,
        scoringMode,
        groupPercent: isSplit ? groupPct : 100,
        individualPercent: isSplit ? individualPct : 0,
        componentScores: componentPayload,
        memberScores: memberPayload,
      };
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/projects/${portfolioId}/moderate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(payload),
        },
      );
      await readApiJson(response, "Unable to save the moderation decision");
      toast.success(decision === "PUBLISH" ? "Project published" : "Revision requested");
      await queryClient.invalidateQueries({ queryKey: ["lecturer-project-detail", workspaceId, portfolioId] });
      await queryClient.invalidateQueries({ queryKey: ["lecturer-scoring-projects", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["lecturer-submission-projects", workspaceId] });
      onDone?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save the moderation decision";
      setFieldError(message);
      toast.error(message);
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <InkcubaLoader label="Loading project…" />
      </div>
    );
  }
  if (query.isError || !project) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {query.error instanceof Error ? query.error.message : "Unable to load this project"}
      </p>
    );
  }

  const metaChips = [
    project.summary.submissionTitle
      ? { icon: BookOpen, label: "Submission", value: project.summary.submissionTitle }
      : null,
    project.summary.className
      ? { icon: School, label: "Class", value: project.summary.className }
      : null,
    project.summary.semesterLabel
      ? { icon: CalendarDays, label: "Semester", value: project.summary.semesterLabel }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof BookOpen;
    label: string;
    value: string;
  }>;

  const goPrevious = () => {
    if (project.neighbors.previousId) onNavigateProject?.(project.neighbors.previousId);
  };
  const goNext = () => {
    if (project.neighbors.nextId) onNavigateProject?.(project.neighbors.nextId);
  };
  const canGoPrevious = Boolean(project.neighbors.previousId && onNavigateProject);
  const canGoNext = Boolean(project.neighbors.nextId && onNavigateProject);

  return (
    <div className="space-y-4">
      <ProjectNavBar
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={goPrevious}
        onNext={goNext}
      />

      <section className="min-w-0 max-w-full rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase sm:px-3 sm:text-xs">
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </span>
            <ProjectHistoryButton
              href={`/api/lecturer/workspaces/${workspaceId}/projects/${portfolioId}/events`}
              queryKey={["lecturer-project-events", workspaceId, portfolioId]}
              size="sm"
              className="h-8 shrink-0 border-slate-900 px-2.5 sm:h-9 sm:px-3"
            />
          </div>
          <h2 className="font-heading text-lg font-bold leading-snug break-words text-slate-900 sm:text-2xl sm:leading-tight">
            {project.title}
          </h2>
          <ProjectJourneyTimeline
            status={project.status}
            hasRevisionHistory={project.journey.hasRevisionHistory}
            hasResubmitted={project.journey.hasResubmitted}
            stageTimestamps={project.journey.stageTimestamps}
          />
          {metaChips.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {metaChips.map((chip, index) => {
                const Icon = chip.icon;
                return (
                  <li
                    key={chip.label}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 sm:gap-2.5 sm:px-3 ${
                      index === 0 ? "col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 sm:h-8 sm:w-8">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                        {chip.label}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-900 sm:text-sm">
                        {chip.value}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/50 px-3 py-2.5 sm:px-5 sm:py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-bold text-slate-900">
              {project.members.length > 1 ? "Students" : "Student"}
            </h3>
            <p className="truncate text-xs text-slate-500">
              {project.members.length}{" "}
              {project.members.length === 1 ? "contributor" : "contributors"} — tap to open profile
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4">
          {project.members.map((member) => {
            const href = getPublicProfileHref({
              id: member.userId,
              nim: member.nim,
              role: "STUDENT",
            });
            return (
              <li key={member.userId} className="min-w-0">
                <Link
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50"
                  aria-label={`Open ${member.name} public profile`}
                >
                  <UserAvatar name={member.name} image={member.image} size="sm" />
                  <span className="min-w-0 overflow-hidden">
                    <span className="block truncate text-sm font-semibold text-sky-700 underline-offset-2 group-hover:underline">
                      {member.name}
                    </span>
                    {member.nim ? (
                      <span className="block truncate text-xs text-slate-500">{member.nim}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
        {project.images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              if (!image.url) return;
              setLightbox({
                src: image.url,
                alt: `Overview image ${index + 1}`,
              });
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-100 text-left shadow-sm transition hover:border-inkcuba-navy focus-visible:ring-2 focus-visible:ring-inkcuba-cyan focus-visible:outline-none",
              index === 0 ? "lg:col-span-6 lg:row-span-2" : "lg:col-span-3",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`Overview image ${index + 1}`}
              className={cn(
                "w-full object-contain bg-slate-950/5 transition duration-300 group-hover:scale-[1.02]",
                index === 0 ? "max-h-[min(70vh,520px)] min-h-[220px]" : "max-h-48 min-h-[140px]",
              )}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Click to zoom
            </span>
          </button>
        ))}

        {project.video ? (
          <div
            className={cn(
              "overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-950 shadow-sm",
              project.images.length === 0 ? "lg:col-span-8" : "lg:col-span-6",
            )}
          >
            <video
              src={project.video.url}
              controls
              preload="metadata"
              className="aspect-video max-h-[min(70vh,480px)] w-full object-contain"
            />
          </div>
        ) : null}

        <section
          className={cn(
            "overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-sm",
            project.video || project.images.length > 0 ? "lg:col-span-6" : "lg:col-span-12",
          )}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/60 px-4 py-3 sm:px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
              <AlignLeft className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900">Description</h3>
              <p className="text-xs text-slate-500">Student write-up for this submission</p>
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            {project.description ? (
              <div
                className="inkcuba-rich-text-content max-h-[min(55vh,480px)] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-sm leading-relaxed text-slate-700 sm:px-4"
                dangerouslySetInnerHTML={{ __html: project.description }}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No description provided.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-sm lg:col-span-6">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/50 px-4 py-3 sm:px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900">Links & files</h3>
              <p className="text-xs text-slate-500">Demo, source, and documentation</p>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div>
              <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                Primary links
              </p>
              <ul className="grid gap-2">
                <LinkRow icon={Globe} label="Demo URL" value={project.demoUrl} />
                <LinkRow icon={PlayCircle} label="Product video URL" value={project.videoUrl} />
                <LinkRow icon={Code2} label="Source code URL" value={project.sourceUrl} />
              </ul>
            </div>

            {project.links.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  Other links
                </p>
                <ul className="grid gap-2">
                  {project.links.map((link) => (
                    <li key={`${link.label}-${link.url}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:border-sky-200 group-hover:text-sky-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {link.label || "External link"}
                          </span>
                          <span className="mt-0.5 block break-all text-xs text-slate-500">{link.url}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                Documentation
              </p>
              {project.documents.length > 0 ? (
                <ul className="grid gap-2">
                  {project.documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:border-sky-200 group-hover:text-sky-700">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-semibold text-slate-900">
                            {doc.fileName}
                          </span>
                          <span className="mt-0.5 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                            {doc.role === "PROJECT" ? "Required" : "Additional"}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No documents uploaded.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-bold text-slate-900">Assessment & moderation</h3>
            <p className="mt-1 text-sm text-slate-600">
              Switch tabs to read the rubric, view published results, or submit a moderation decision.
              Double submits are ignored via an idempotency key.
            </p>
          </div>

          <ProjectAssessmentPanel
            rubric={project.rubric}
            maxScore={project.maxScore}
            scoreSheet={project.scoreSheet}
            defaultTab={
              project.canModerate
                ? "moderation"
                : project.scoreSheet?.decision === "PUBLISH" || project.status === "PUBLISHED"
                  ? "results"
                  : "rubric"
            }
            moderationBadge={
              project.canModerate
                ? { label: "Action", tone: "action" }
                : project.status === "PUBLISHED"
                  ? { label: "Done", tone: "ready" }
                  : { label: "Closed", tone: "pending" }
            }
            moderation={
              project.canModerate ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                  {revisionPolicy ? (
                    <div
                      role="status"
                      className={cn(
                        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                        revisionBlocked
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-700",
                      )}
                    >
                      {revisionBlocked ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      ) : (
                        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold">
                          Revisions used {revisionPolicy.revisionCount} of{" "}
                          {revisionPolicy.maxRevisions}
                        </p>
                        <p className="mt-0.5 text-xs">
                          {revisionBlocked
                            ? "The revision limit has been reached. You must Publish this project with a score; another revision cannot be requested."
                            : `${revisionPolicy.remainingRevisions} ${
                                revisionPolicy.remainingRevisions === 1 ? "revision" : "revisions"
                              } remaining.`}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDecision("PUBLISH")}
                      className={cn(
                        "cursor-pointer rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                        decision === "PUBLISH"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </span>
                      <span className="mt-1 block text-xs font-normal text-slate-600">
                        Rubric scores required. Feedback optional.
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={revisionBlocked}
                      aria-disabled={revisionBlocked}
                      onClick={() => {
                        if (!revisionBlocked) setDecision("REVISION");
                      }}
                      className={cn(
                        "rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                        revisionBlocked
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : decision === "REVISION"
                            ? "cursor-pointer border-amber-600 bg-amber-50 text-amber-950"
                            : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquareWarning className="h-4 w-4" />
                        Request revision
                      </span>
                      <span className="mt-1 block text-xs font-normal text-slate-600">
                        {revisionBlocked
                          ? "Unavailable: revision limit reached."
                          : "Feedback only. No score is recorded."}
                      </span>
                    </button>
                  </div>

                  {!isRevision ? (
                    <div className="space-y-4">
                      {isGroup ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              How should this group be scored?
                            </h4>
                            <p className="mt-0.5 text-xs text-slate-600">
                              Group only uses one rubric pass for everyone. Group + individual scores
                              the same rubric for the group and again for each student, then blends by
                              percent.
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(
                              [
                                {
                                  split: false,
                                  label: "Group only",
                                  hint: "One rubric score shared by every member.",
                                },
                                {
                                  split: true,
                                  label: "Group + individual",
                                  hint: "Rubric for the group, then the same rubric per student.",
                                },
                              ] as const
                            ).map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                disabled={busy}
                                onClick={() => setGroupModeSplit(option.split)}
                                className={cn(
                                  "cursor-pointer rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition",
                                  groupModeSplit === option.split
                                    ? "border-inkcuba-navy bg-white text-slate-900 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                )}
                              >
                                {option.label}
                                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                  {option.hint}
                                </span>
                              </button>
                            ))}
                          </div>
                          {isSplit ? (
                            <div className="grid max-w-md grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-700">
                                  Group weight %
                                </span>
                                <Input
                                  inputMode="numeric"
                                  value={groupPercent}
                                  disabled={busy}
                                  className="h-10 rounded-xl"
                                  onChange={(event) => {
                                    const digits = event.target.value
                                      .replace(/[^\d]/g, "")
                                      .slice(0, 3);
                                    setGroupPercent(
                                      digits !== "" && Number(digits) > 100 ? "100" : digits,
                                    );
                                  }}
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-700">
                                  Individual weight %
                                </span>
                                <Input
                                  inputMode="numeric"
                                  value={String(individualPct)}
                                  disabled={busy}
                                  className="h-10 rounded-xl"
                                  onChange={(event) => {
                                    const digits = event.target.value
                                      .replace(/[^\d]/g, "")
                                      .slice(0, 3);
                                    const value = Math.min(100, Number(digits) || 0);
                                    setGroupPercent(String(100 - value));
                                  }}
                                />
                              </label>
                              <p className="col-span-2 text-xs text-slate-500">
                                Weights always total 100%. Final grade = group total × {groupPct}% +
                                each student’s rubric total × {individualPct}%.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                          Individual submission — score this project once against every rubric
                          component.
                        </p>
                      )}

                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {isGroup ? "Group rubric scores" : "Rubric scores"}
                        </h4>
                        <RubricScoreInputs
                          rubric={project.rubric}
                          values={componentScores}
                          disabled={busy}
                          total={componentTotal}
                          maxScore={project.maxScore}
                          onChange={(id, value) =>
                            setComponentScores((current) => ({ ...current, [id]: value }))
                          }
                        />
                      </div>

                      {isSplit ? (
                        <MemberScoringPanel
                          members={project.members}
                          rubric={project.rubric}
                          maxScore={project.maxScore}
                          memberComponentScores={memberComponentScores}
                          activeMemberId={activeMemberId ?? project.members[0]?.userId ?? null}
                          disabled={busy}
                          onSelectMember={setActiveMemberId}
                          onChangeScore={(userId, rubricId, value) =>
                            setMemberComponentScores((current) => ({
                              ...current,
                              [userId]: { ...(current[userId] ?? {}), [rubricId]: value },
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        Feedback{" "}
                        <span className="text-xs font-medium text-slate-500">
                          {isRevision ? "Required" : "Optional"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          feedbackPlainLength > PROJECT_FEEDBACK_MAX
                            ? "text-red-600"
                            : "text-slate-500",
                        )}
                      >
                        {feedbackPlainLength}/{PROJECT_FEEDBACK_MAX}
                      </span>
                    </div>
                    <WorkspaceRichTextEditor
                      value={feedback}
                      onChange={setFeedback}
                      disabled={busy}
                      allowImages={false}
                      showCounter={false}
                      maxPlainLength={PROJECT_FEEDBACK_MAX}
                      ariaLabel="Lecturer feedback"
                      placeholder={
                        decision === "REVISION"
                          ? "Explain what the student should fix before resubmitting…"
                          : "Optional note for the student about this score…"
                      }
                    />
                  </div>

                  {fieldError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {fieldError}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    className="bg-inkcuba-cyan hover:bg-sky-600"
                    disabled={busy || (isRevision && revisionBlocked)}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {decision === "PUBLISH" ? "Publish project" : "Send revision request"}
                  </Button>
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                  {project.status === "DRAFT"
                    ? "This project is still a draft. Scoring opens after the student submits it."
                    : project.status === "NEED_REVISION"
                      ? "Waiting for the student to revise and resubmit before you can moderate again."
                      : project.status === "PUBLISHED"
                        ? `This project is already published${project.grade != null ? ` with score ${project.grade}/${project.maxScore}` : ""}. Open Scoring results for the full breakdown.`
                        : "This project is not open for a new moderation decision right now."}
                </p>
              )
            }
          />
      </section>

      <ProjectNavBar
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={goPrevious}
        onNext={goNext}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={decision === "PUBLISH" ? "Publish this project?" : "Request a revision?"}
        description={
          decision === "PUBLISH"
            ? "The student will see the score and can no longer edit this project."
            : "The student will receive your feedback and can revise before the submission deadline. Group moves unlock again during revision."
        }
        confirmLabel={decision === "PUBLISH" ? "Publish" : "Request revision"}
        loading={busy}
        onConfirm={submitDecision}
      />

      {lightbox?.src ? (
        <ProfilePhotoLightbox
          open
          onOpenChange={(open) => {
            if (!open) setLightbox(null);
          }}
          src={lightbox.src}
          alt={lightbox.alt}
        />
      ) : null}
    </div>
  );
}

function ProjectNavBar({
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      aria-label="Project navigation"
      className="flex items-center justify-between gap-3 text-sm"
    >
      <button
        type="button"
        disabled={!canGoPrevious}
        onClick={onPrevious}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold transition",
          canGoPrevious
            ? "cursor-pointer text-inkcuba-navy hover:bg-slate-100"
            : "cursor-not-allowed text-slate-300",
        )}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Previous
      </button>
      <button
        type="button"
        disabled={!canGoNext}
        onClick={onNext}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold transition",
          canGoNext
            ? "cursor-pointer text-inkcuba-navy hover:bg-slate-100"
            : "cursor-not-allowed text-slate-300",
        )}
      >
        Next
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </button>
    </nav>
  );
}

function MemberScoringPanel({
  members,
  rubric,
  maxScore,
  memberComponentScores,
  activeMemberId,
  disabled,
  onSelectMember,
  onChangeScore,
}: {
  members: Array<{ userId: string; name: string; image: string | null; nim: string | null }>;
  rubric: Array<{
    id: string;
    name: string;
    description: string | null;
    weightPercent: number;
    maxPoints: number;
  }>;
  maxScore: number;
  memberComponentScores: Record<string, Record<string, string>>;
  activeMemberId: string | null;
  disabled?: boolean;
  onSelectMember: (userId: string) => void;
  onChangeScore: (userId: string, rubricId: string, value: string) => void;
}) {
  const active =
    members.find((member) => member.userId === activeMemberId) ?? members[0] ?? null;
  const completedCount = members.filter((member) =>
    isRubricScoresComplete(rubric, memberComponentScores[member.userId] ?? {}),
  ).length;
  const scores = active ? (memberComponentScores[active.userId] ?? {}) : {};
  const memberTotal = sumRubricScores(rubric, scores);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Individual rubric scores</h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Select a student, then score the same rubric. Only one student form is open at a time.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {completedCount}/{members.length} complete
        </span>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-contain px-1 pb-1">
        {members.map((member) => {
          const done = isRubricScoresComplete(
            rubric,
            memberComponentScores[member.userId] ?? {},
          );
          const selected = active?.userId === member.userId;
          return (
            <button
              key={member.userId}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMember(member.userId)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition",
                selected
                  ? "border-inkcuba-navy bg-inkcuba-navy text-white"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              <UserAvatar name={member.name} image={member.image} size="sm" />
              <span className="max-w-[9rem] truncate">{member.name}</span>
              {done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex min-w-0 items-center gap-2.5">
            <UserAvatar name={active.name} image={active.image} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{active.name}</p>
              {active.nim ? (
                <p className="truncate text-xs text-slate-500">NIM {active.nim}</p>
              ) : null}
            </div>
          </div>
          <RubricScoreInputs
            dense
            rubric={rubric}
            values={scores}
            disabled={disabled}
            total={memberTotal}
            maxScore={maxScore}
            onChange={(id, value) => onChangeScore(active.userId, id, value)}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          No group members to score.
        </p>
      )}
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
}) {
  if (!value) {
    return (
      <li className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-700">{label}</span>
          <span className="text-xs text-slate-400">Not provided</span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition hover:border-sky-300 hover:bg-sky-50"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:border-sky-200 group-hover:text-sky-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          <span className="mt-0.5 block break-all text-xs text-sky-700 group-hover:underline">
            {value}
          </span>
        </span>
      </a>
    </li>
  );
}
