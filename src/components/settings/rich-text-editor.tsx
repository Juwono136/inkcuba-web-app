"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Unlink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
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

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Write a short bio…",
}: RichTextEditorProps) {
  const skipNextExternalSync = useRef(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      // TipTap v3 StarterKit already ships Link — disable it so we can
      // configure a single Link instance with openOnClick: false.
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
        shouldAutoLink: (url) => isValidLinkHref(url) || /^https?:\/\//i.test(url),
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    // TipTap React v3 defaults this off; we need rerenders for toolbar active states + placeholder.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => {
      skipNextExternalSync.current = true;
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "inkcuba-rich-text min-h-[140px] px-3 py-2 text-sm text-slate-900 outline-none",
          "focus-visible:outline-none",
        ),
        "aria-label": "Bio",
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

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
    setLinkDialogOpen(false);
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
  }

  if (!editor) {
    return (
      <div
        className="min-h-[180px] animate-pulse rounded-xl border-2 border-slate-200 bg-slate-50"
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
              Links open in a new tab. Only http and https URLs are allowed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bio-link-url">URL</Label>
            <Input
              id="bio-link-url"
              value={linkDraft}
              onChange={(event) => {
                setLinkDraft(event.target.value);
                setLinkError(null);
              }}
              placeholder="https://..."
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
              }}
              aria-invalid={Boolean(linkError)}
            />
            {linkError ? (
              <p className="text-xs text-red-500">{linkError}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            {editor.isActive("link") ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeLink}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Remove link
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
                className="border-slate-900"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={applyLink}
              className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
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
      // Keep editor selection when clicking the toolbar (critical for marks/lists).
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
