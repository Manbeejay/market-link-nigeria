import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";

interface Props {
  orderId: string;
  revieweeId: string;
  revieweeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const ReviewDialog = ({
  orderId,
  revieweeId,
  revieweeName,
  open,
  onOpenChange,
  onSubmitted,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(5);
      setComment("");
    }
  }, [open]);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Review not saved", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Thanks for your review!" });
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {revieweeName}</DialogTitle>
          <DialogDescription>
            Your rating helps other people on MarketLink trade with confidence.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => setRating(value)}
              className="p-1"
            >
              <Star
                className={`h-7 w-7 ${
                  value <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did the trade go? (optional)"
          rows={4}
          maxLength={1000}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
