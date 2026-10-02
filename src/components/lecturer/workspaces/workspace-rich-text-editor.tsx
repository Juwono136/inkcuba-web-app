"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Unlink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WORKSPACE_DESCRIPTION_MAX_PLAIN } from "@/lib/workspaces/types";
import { plainTextFromHtml } from "@/lib/settings/plain-text";

type WorkspaceRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Upload endpoint for description images (tmp or workspace-scoped). */
  imageUploadUrl: string;
};

function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return "";
  }
  return trimmed;
}

function isValidLinkHref(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

export function WorkspaceRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Describe this workspace…",
  imageUploadUrl,
}: WorkspaceRichTextEditorProps) {
  const skipNextExternalSync = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-sky-600 underline underline-offset-2",
        },
        isAllowedUri: (url, { defaultValidate }) => defaultValidate(url),
        shouldAutoLink: (url) =>
          isValidLinkHref(url) || /^https?:\/\//i.test(url),
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-h-80 rounded-xl border border-slate-200",
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => {
      skipNextExternalSync.current = true;
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "inkcuba-rich-text min-h-[160px] px-3 py-2 text-sm text-slate-900 outline-none",
          "[&_img]:my-2 [&_img]:max-w-full",
        ),
        "aria-label": "Workspace description",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (skipNextExternalSync.current) {
      skipNextExternalSync.current = false;
      return;
    }
    const current = normalizeEditorHtml(editor.getHTML());
    const incoming = normalizeEditorHtml(value || "");
    if (incoming !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const plainLength = plainTextFromHtml(value || "").length;

  async function handleImageSelected(file: File | null) {
    if (!file || !editor) return;

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(imageUploadUrl, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ApiEnvelope<{
        key: string;
        url: string;
      }>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Upload failed");
      }
      editor
        .chain()
        .focus()
        .setImage({ src: payload.data.url, alt: file.name })
        .run();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openLinkDialog() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(previous?.trim() || "https://");
    setLinkError(null);
    setLinkDialogOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = linkDraft.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }
    if (!isValidLinkHref(href)) {
      setLinkError("Enter a valid http(s) URL");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkDialogOpen(false);
  }

  if (!editor) {
    return (
      <div
        className="min-h-[200px] animate-pulse rounded-xl border-2 border-slate-200 bg-slate-50"
        aria-hidden
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border-2 border-slate-900 bg-white transition-opacity",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <div className="flex flex-wrap gap-1 border-b-2 border-slate-200 bg-slate-50 p-2">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor.isActive("link")}
            onClick={openLinkDialog}
            disabled={disabled}
          >
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          {editor.isActive("link") ? (
            <ToolbarButton
              label="Remove link"
              onClick={() =>
                editor.chain().focus().extendMarkRange("link").unsetLink().run()
              }
              disabled={disabled}
            >
              <Unlink className="h-4 w-4" />
            </ToolbarButton>
          ) : null}
          <ToolbarButton
            label="Insert image"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploadingImage}
          >
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            className="hidden"
            onChange={(event) =>
              handleImageSelected(event.target.files?.[0] ?? null)
            }
          />
        </div>
        <div className="relative">
          {editor.isEmpty ? (
            <p
              className="pointer-events-none absolute top-2 left-3 text-sm text-slate-400 select-none"
              aria-hidden
            >
              {placeholder}
            </p>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs",
          plainLength > WORKSPACE_DESCRIPTION_MAX_PLAIN
            ? "font-semibold text-red-600"
            : "text-slate-500",
        )}
      >
        {plainLength}/{WORKSPACE_DESCRIPTION_MAX_PLAIN} characters
      </p>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent
          showCloseButton
          className="border-2 border-slate-900 shadow-inkcuba sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-slate-900">
              Insert link
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Only http and https URLs are allowed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-link-url">URL</Label>
            <Input
              id="workspace-link-url"
              value={linkDraft}
              onChange={(event) => {
                setLinkDraft(event.target.value);
                setLinkError(null);
              }}
              placeholder="https://..."
              autoFocus
              aria-invalid={Boolean(linkError)}
            />
            {linkError ? (
              <p className="text-xs text-red-500">{linkError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
              onClick={applyLink}
            >
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "h-8 w-8 border-slate-300 transition-colors",
        active && "border-sky-500 bg-sky-50 text-sky-700",
      )}
    >
      {children}
    </Button>
  );
}
