import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Sprout, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"farmer" | "startup">("farmer");

  const handleLogin = (type: "farmer" | "startup") => {
    // Simulate login and redirect based on user type
    setTimeout(() => {
      if (type === "farmer") {
        navigate("/home");
      } else {
        navigate("/dashboard");
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">AgroScope</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Join AgroScope
            </h1>
            <p className="text-xl text-muted-foreground">
              The Circular Economy Platform
            </p>
          </div>

          {/* Tabs Card */}
          <Card className="border-2 shadow-card">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "farmer" | "startup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                <TabsTrigger 
                  value="farmer" 
                  className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Sprout className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">I am a Farmer</div>
                    <div className="text-xs opacity-90">Supplier</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="startup"
                  className="flex items-center gap-2 py-4 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                >
                  <Building2 className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">I am a Startup</div>
                    <div className="text-xs opacity-90">Buyer</div>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* Farmer Tab */}
              <TabsContent value="farmer">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">Welcome, Farmer!</CardTitle>
                  <CardDescription className="text-base">
                    Transform your agricultural waste into revenue. <span className="text-primary font-semibold">100% Free Service.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="farmer-email">Email</Label>
                      <Input id="farmer-email" type="email" placeholder="Enter your email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="farmer-password">Password</Label>
                      <Input id="farmer-password" type="password" placeholder="Create a password" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      variant="cta" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleLogin("farmer")}
                    >
                      Create Free Account
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button 
                        onClick={() => handleLogin("farmer")}
                        className="text-primary font-semibold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold text-foreground">What you'll get:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Instant AI-powered waste valuations
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Connect with verified buyers nearby
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Zero fees, maximum revenue
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </TabsContent>

              {/* Startup Tab */}
              <TabsContent value="startup">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">Welcome, Business!</CardTitle>
                  <CardDescription className="text-base">
                    Source quality agricultural waste for your operations. <span className="text-secondary font-semibold">Access Verified Leads.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="startup-email">Business Email</Label>
                      <Input id="startup-email" type="email" placeholder="Enter your business email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startup-password">Password</Label>
                      <Input id="startup-password" type="password" placeholder="Create a password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startup-company">Company Name</Label>
                      <Input id="startup-company" type="text" placeholder="Your company name" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleLogin("startup")}
                    >
                      Register Your Business
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already registered?{" "}
                      <button 
                        onClick={() => handleLogin("startup")}
                        className="text-secondary font-semibold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold text-foreground">What you'll get:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Real-time access to localized feedstock
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Verified quality and quantity data
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Reduce logistics costs significantly
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            By continuing, you agree to AgroScope's{" "}
            <button className="text-primary hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button className="text-primary hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
