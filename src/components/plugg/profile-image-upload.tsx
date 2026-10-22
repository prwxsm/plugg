import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { art } from "@/data/covers";
import { cn } from "@/lib/utils";

interface ProfileImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  description?: string;
}

interface ImageResolutionInfo {
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
}

/**
 * Determines and renders the optimal square resolution for an avatar image.
 * Uses center-crop and bicubic interpolation to produce a crisp 512x512 HD avatar.
 */
async function processAvatarImage(file: File): Promise<{
  blob: Blob;
  dataUrl: string;
  info: ImageResolutionInfo;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;

        // Target high-definition square avatar: 512x512 standard
        const targetDim = 512;

        // Center-crop to 1:1 aspect ratio
        const squareSize = Math.min(origW, origH);
        const sx = (origW - squareSize) / 2;
        const sy = (origH - squareSize) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw center-cropped square into 512x512 canvas
        ctx.drawImage(img, sx, sy, squareSize, squareSize, 0, 0, targetDim, targetDim);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create image blob"));
              return;
            }
            const dataUrl = canvas.toDataURL("image/webp", 0.92);
            resolve({
              blob,
              dataUrl,
              info: {
                originalWidth: origW,
                originalHeight: origH,
                targetWidth: targetDim,
                targetHeight: targetDim,
                aspectRatio: "1:1 Square",
              },
            });
          },
          "image/webp",
          0.92
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileImageUpload({
  value,
  onChange,
  className,
  label = "Profile picture",
  description = "Upload a photo. Our system automatically optimizes and crops it to the standard 512 × 512 HD avatar resolution.",
}: ProfileImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolutionInfo, setResolutionInfo] = useState<ImageResolutionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const { blob, dataUrl, info } = await processAvatarImage(file);
      setResolutionInfo(info);

      // Attempt upload to backend server storage
      try {
        const formData = new FormData();
        formData.append("file", blob, `avatar-${Date.now()}.webp`);
        formData.append("category", "image");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.url) {
            onChange(resData.url);
            return;
          }
        }
      } catch (uploadErr) {
        console.warn("Server upload failed, using high-res local data URL fallback:", uploadErr);
      }

      // Fallback: use high-res processed dataUrl
      onChange(dataUrl);
    } catch (err: unknown) {
      console.error("Image processing error:", err);
      setError((err as Error)?.message || "Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div>
        {/* Avatar preview */}
        <div className="relative inline-block group shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={onFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl bg-elevated shadow-md transition-all sm:h-28 sm:w-28",
              isDragging
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:ring-2 hover:ring-primary/40",
            )}
            title="Click to change photo"
          >
            <img
              src={art(value)}
              alt="Profile preview"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs text-xs">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="mt-1 text-[11px] font-medium">Optimizing...</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="Change photo"
            aria-label="Change photo"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Resolution status badge if determined */}
      {resolutionInfo ? (
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>
            Resolution auto-optimized: {resolutionInfo.originalWidth} × {resolutionInfo.originalHeight} px →{" "}
            <strong>{resolutionInfo.targetWidth} × {resolutionInfo.targetHeight} px</strong> ({resolutionInfo.aspectRatio})
          </span>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
