import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Server } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      <div className="relative text-center animate-slide-up">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center glow-effect">
            <Server className="w-7 h-7 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold gradient-text mb-4">PteroDash</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          Manage your game servers with ease. Create, configure, and monitor — all in one place.
        </p>
        <Button variant="glow" size="lg" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
