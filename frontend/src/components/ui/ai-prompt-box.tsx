import React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowUp, Paperclip, Square, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
))
Textarea.displayName = "Textarea"

// ── Tooltip ───────────────────────────────────────────────────────────────────
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-primary shadow-md animate-in fade-in-0 zoom-in-95",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// ── Dialog (for image preview) ────────────────────────────────────────────────
const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] border border-border bg-surface-2 shadow-xl rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-surface-3 p-1.5 hover:bg-border transition-all">
        <X className="h-4 w-4 text-text-secondary" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("sr-only", className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// ── Image View Dialog ─────────────────────────────────────────────────────────
const ImageViewDialog: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-2">
        <DialogTitle>Image Preview</DialogTitle>
        <img src={imageUrl} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-lg" />
      </DialogContent>
    </Dialog>
  )
}

// ── PromptInput context ───────────────────────────────────────────────────────
interface PromptInputContextType {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false, value: "", setValue: () => {}, maxHeight: 240,
})
const usePromptInput = () => React.useContext(PromptInputContext)

// ── PromptInput root ──────────────────────────────────────────────────────────
interface PromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, isLoading = false, maxHeight = 240, value, onValueChange, onSubmit, children, disabled = false, onDragOver, onDragLeave, onDrop }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    const handleChange = (v: string) => { setInternalValue(v); onValueChange?.(v) }
    return (
      <TooltipProvider>
        <PromptInputContext.Provider value={{ isLoading, value: value ?? internalValue, setValue: onValueChange ?? handleChange, maxHeight, onSubmit, disabled }}>
          <div
            ref={ref}
            className={cn("rounded-2xl border border-border bg-surface-2 p-3 shadow-lg transition-all duration-200 focus-within:border-primary/40", className)}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    )
  }
)
PromptInput.displayName = "PromptInput"

// ── PromptInputTextarea ───────────────────────────────────────────────────────
const PromptInputTextarea: React.FC<{ disableAutosize?: boolean; placeholder?: string } & React.ComponentProps<typeof Textarea>> = ({
  className, onKeyDown, disableAutosize = false, placeholder, ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`
  }, [value, maxHeight, disableAutosize])

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit?.() }
        onKeyDown?.(e)
      }}
      className={cn("text-sm", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  )
}

// ── PromptInputAction ─────────────────────────────────────────────────────────
const PromptInputAction: React.FC<{ tooltip: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }> = ({
  tooltip, children, side = "top"
}) => {
  const { disabled } = usePromptInput()
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={disabled}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

// ── Main PromptInputBox ───────────────────────────────────────────────────────
export interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  ({ onSend = () => {}, isLoading = false, placeholder = "Ask about your documents...", className }, ref) => {
    const [input, setInput] = React.useState("")
    const [files, setFiles] = React.useState<File[]>([])
    const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({})
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null)
    const uploadInputRef = React.useRef<HTMLInputElement>(null)

    const isImageFile = (file: File) => file.type.startsWith("image/")

    const processFile = (file: File) => {
      if (!isImageFile(file)) return
      if (file.size > 10 * 1024 * 1024) return
      setFiles([file])
      const reader = new FileReader()
      reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string })
      reader.readAsDataURL(file)
    }

    const handleDragOver = React.useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }, [])
    const handleDragLeave = React.useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }, [])
    const handleDrop = React.useCallback((e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation()
      const dropped = Array.from(e.dataTransfer.files).filter(isImageFile)
      if (dropped.length > 0) processFile(dropped[0])
    }, [])

    const handlePaste = React.useCallback((e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile()
          if (file) { e.preventDefault(); processFile(file); break }
        }
      }
    }, [])

    React.useEffect(() => {
      document.addEventListener("paste", handlePaste)
      return () => document.removeEventListener("paste", handlePaste)
    }, [handlePaste])

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) return
      onSend(input, files)
      setInput("")
      setFiles([])
      setFilePreviews({})
    }

    const hasContent = input.trim() !== "" || files.length > 0

    return (
      <>
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn("w-full", className)}
          disabled={isLoading}
          ref={ref}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Image previews */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 pb-2"
              >
                {files.map((file, index) => (
                  filePreviews[file.name] && (
                    <div key={index} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-border cursor-pointer"
                      onClick={() => setSelectedImage(filePreviews[file.name])}>
                      <img src={filePreviews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setFiles([]); setFilePreviews({}) }}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <PromptInputTextarea
            placeholder={placeholder}
            className="px-1 py-1 min-h-[32px]"
          />

          {/* Actions row */}
          <div className="flex items-center justify-between pt-2">
            {/* Left: attach */}
            <div className="flex items-center gap-1">
              <PromptInputAction tooltip="Attach image">
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-3 hover:text-text-secondary transition-colors disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) processFile(e.target.files[0])
                      if (e.target) e.target.value = ""
                    }}
                  />
                </button>
              </PromptInputAction>
              <span className="text-xs text-text-tertiary pl-1 hidden sm:block">
                {isLoading ? "Generating..." : "Shift+Enter for new line"}
              </span>
            </div>

            {/* Right: send / stop */}
            <PromptInputAction tooltip={isLoading ? "Generating..." : hasContent ? "Send" : "Type a message"}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSubmit}
                disabled={(!hasContent && !isLoading) || isLoading}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                  hasContent && !isLoading
                    ? "bg-primary hover:bg-primary-hover text-surface-0"
                    : isLoading
                    ? "bg-surface-3 text-danger cursor-not-allowed"
                    : "bg-surface-3 text-text-tertiary cursor-not-allowed"
                )}
              >
                {isLoading
                  ? <Square className="h-3 w-3 fill-current" />
                  : <ArrowUp className="h-4 w-4" />
                }
              </motion.button>
            </PromptInputAction>
          </div>
        </PromptInput>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    )
  }
)
PromptInputBox.displayName = "PromptInputBox"
