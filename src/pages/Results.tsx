import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, ArrowLeft, Home, CheckCircle2, TrendingUp, Droplets, Package } from "lucide-react";

const Results = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/input')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Results Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your Valuation is Ready!
          </h1>
          <div className="inline-flex items-center gap-4 text-muted-foreground bg-muted px-6 py-3 rounded-full">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="font-semibold">Paddy Husk</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">5 Tons</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">Location Verified</span>
            </div>
          </div>
        </div>

        {/* Top Recommendation */}
        <Card className="border-2 border-primary shadow-elegant mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-1">
            <div className="bg-card p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge className="bg-accent text-accent-foreground text-sm px-3 py-1">
                  Top Recommendation
                </Badge>
              </div>
              
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-3xl mb-3">Insulation Board Production</CardTitle>
                <CardDescription className="text-base">
                  Transform your paddy husk into high-demand insulation boards for the construction industry
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 space-y-6">
                {/* Value Display */}
                <div className="bg-primary/5 rounded-lg p-6 border-2 border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2">Estimated Value</div>
                  <div className="text-4xl font-bold text-primary mb-1">$0.07 - $0.10</div>
                  <div className="text-muted-foreground">per kilogram</div>
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <div className="text-2xl font-bold text-foreground">
                      Total: $350 - $500
                      <span className="text-sm font-normal text-muted-foreground ml-2">for 5 tons</span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Key Benefits:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Highest market value for paddy husk</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Strong demand in construction sector</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Leaf className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Eco-friendly sustainable material</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">3 verified buyers within 15km</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  variant="cta" 
                  size="lg" 
                  className="w-full text-lg"
                  onClick={() => {
                    alert("Connecting you with verified buyers...");
                  }}
                >
                  Connect with Nearest Verified Buyer
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  ✓ Zero fees for farmers • ✓ Direct contact • ✓ Verified buyers only
                </p>
              </CardContent>
            </div>
          </div>
        </Card>

        {/* Alternative Use */}
        <Card className="border-2 hover:shadow-card transition-all duration-300">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline" className="text-sm">
                Alternative Use
              </Badge>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Estimated Value</div>
                <div className="text-2xl font-bold text-secondary">$0.04 - $0.06</div>
                <div className="text-xs text-muted-foreground">per kilogram</div>
              </div>
            </div>
            <CardTitle className="text-2xl">Biofuel Production</CardTitle>
            <CardDescription className="text-base">
              Convert your paddy husk into sustainable biofuel pellets for energy generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Droplets className="w-4 h-4 text-secondary" />
                <span>Lower processing costs</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <span>Growing renewable energy market</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4 text-secondary" />
                <span>2 buyers available in your area</span>
              </div>
            </div>
            <Button variant="outline" size="lg" className="w-full">
              View Details
            </Button>
          </CardContent>
        </Card>

        {/* Disclaimer & New Calculation */}
        <div className="mt-12 text-center space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Valuations are AI-generated estimates based on current market data. 
              Actual prices may vary based on quality, moisture content, and buyer requirements.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/input')}
          >
            Perform New Calculation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
