
"use client";

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Heading2, Undo, Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (richText: string) => void;
  wrapperClassName?: string; // Optional class for the main wrapper
  editorClassName?: string; // Optional class for the editor content area
}

const RichTextEditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    label,
    disabled,
  }: {
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
    label: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'outline'}
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn("h-8 px-2", isActive && "bg-secondary text-secondary-foreground")}
    >
      {children}
    </Button>
  );

  return (
    <div className="border-b border-input bg-transparent p-1 flex flex-wrap items-center gap-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        label="Bold"
        disabled={!editor.can().chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        label="Italic"
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        label="Strikethrough"
        disabled={!editor.can().chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        label="Heading 2"
        disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        label="Bullet List"
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        label="Ordered List"
        disabled={!editor.can().chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        label="Blockquote"
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
       <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        label="Code Block"
        disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <div className="flex gap-1 ml-auto">
        <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false} 
            label="Undo"
            disabled={!editor.can().undo()}
        >
            <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            label="Redo"
            disabled={!editor.can().redo()}
        >
            <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
};

const RichTextEditor = ({ value, onChange, wrapperClassName, editorClassName }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Example: Disable dropcursor if you don't need it
        // dropcursor: false,
        // History is enabled by default for undo/redo
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base max-w-none',
          'min-h-[150px] w-full px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          editorClassName, // Allows custom styling for the content area from props
        ),
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // This useEffect ensures that if the `value` prop changes externally (e.g. form.reset()),
  // the editor's content is updated.
  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  return (
    <div className={cn("rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", wrapperClassName)}>
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
