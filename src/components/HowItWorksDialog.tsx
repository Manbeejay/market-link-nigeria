import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface Step {
  title: string;
  text: string;
}

const farmerSteps: Step[] = [
  {
    title: "Register",
    text: "Create your account with your email and password, then confirm your email using the link we send you.",
  },
  {
    title: "Activate your membership",
    text: "Pay the ₦5,000 annual membership through Paystack. Membership is needed to list and trade.",
  },
  {
    title: "Update your profile",
    text: "Add your details, then open My Wallet to add and verify your bank details. Paystack uses them to pay you.",
  },
  {
    title: "List your produce",
    text: "Open My Listings and add the product, price, quantity, photos and delivery option. The description writer can help with the wording.",
  },
  {
    title: "Receive an order request",
    text: "A buyer asks for a quantity. You get a bell notification and an email.",
  },
  {
    title: "Accept the order",
    text: "Open Orders and accept or decline the request. The buyer can pay only after you accept.",
  },
  {
    title: "Deliver and mark delivered",
    text: "Once the order shows Paid, arrange pickup or delivery with the buyer, then tap Mark delivered.",
  },
  {
    title: "Receive payment settlement",
    text: "Paystack sends your 95% share to your verified bank account. The order is complete when the buyer confirms receipt.",
  },
];

const buyerSteps: Step[] = [
  {
    title: "Register",
    text: "Create your account with your email and password, then confirm your email using the link we send you.",
  },
  {
    title: "Activate your membership",
    text: "Pay the ₦5,000 annual membership through Paystack. Membership is needed to browse and order.",
  },
  {
    title: "Browse products",
    text: "Search by category or location and open a listing to see the price, quantity, delivery options and farmer.",
  },
  {
    title: "Request a quantity",
    text: "Enter how many you want and send the request. You pay nothing at this stage.",
  },
  {
    title: "Farmer accepts",
    text: "You get a bell notification and an email when the farmer accepts or declines.",
  },
  {
    title: "Pay through Paystack",
    text: "Open Orders and tap Pay now to pay securely through Paystack.",
  },
  {
    title: "Arrange pickup or delivery",
    text: "Agree the details with the farmer in the order chat.",
  },
  {
    title: "Confirm receipt",
    text: "When you have the produce, tap Confirm received and leave a review. If something is wrong, tap Report a problem.",
  },
];

const StepList = ({ steps }: { steps: Step[] }) => (
  <ol className="space-y-4">
    {steps.map((step, i) => (
      <li key={step.title} className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white">
          {i + 1}
        </span>
        <div>
          <p className="font-semibold text-gray-900">{step.title}</p>
          <p className="text-sm text-gray-600">{step.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

interface HowItWorksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: "farmer" | "buyer";
}

const HowItWorksDialog = ({ open, onOpenChange, defaultRole = "farmer" }: HowItWorksDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>How MarketLink Nigeria works</DialogTitle>
        <DialogDescription>
          Follow these steps from registration to payment. Choose whether you are selling or buying.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue={defaultRole}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="farmer">I am a farmer</TabsTrigger>
          <TabsTrigger value="buyer">I am a buyer</TabsTrigger>
        </TabsList>
        <TabsContent value="farmer" className="pt-4">
          <StepList steps={farmerSteps} />
        </TabsContent>
        <TabsContent value="buyer" className="pt-4">
          <StepList steps={buyerSteps} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-gray-500">Questions? Email contact@marketlinknigeria.com.</p>

      <DialogFooter>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default HowItWorksDialog;
