import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSuccess?: (newEmail: string) => void;
}
export function ChangeEmailModal({ open, onOpenChange, currentEmail }: ChangeEmailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6">
        <DialogHeader>
          <DialogTitle>Change email address</DialogTitle>
          <DialogDescription>
            Email changes are temporarily unavailable while secure ownership verification is being
            connected.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Your current email remains {currentEmail}.</p>
        <button
          type="button"
          className="rounded-full bg-primary text-primary-foreground px-4 py-2"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </DialogContent>
    </Dialog>
  );
}
