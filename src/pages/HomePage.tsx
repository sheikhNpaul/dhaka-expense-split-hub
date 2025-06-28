import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  BarChart3, 
  Smartphone,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const features = [
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Smart Expense Tracking",
    description: "Monitor your daily spending with intelligent categorization and insights"
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Group Expense Splitting",
    description: "Easily split bills with roommates, friends, and family members"
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Visual Analytics",
    description: "Get detailed insights into your spending patterns with interactive charts"
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Secure & Private",
    description: "Your financial data is protected with enterprise-grade security"
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Real-time Sync",
    description: "Access your expenses across all devices instantly"
  },
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: "Mobile Optimized",
    description: "Full-featured mobile experience for tracking on the go"
  }
];

const benefits = [
  "No hidden fees or subscription costs",
  "Unlimited expense tracking",
  "Export data anytime",
  "24/7 customer support",
  "Regular feature updates",
  "Cross-platform compatibility"
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              🚀 Now with AI-powered insights
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Smart Expense
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {" "}Tracking
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Take control of your finances with powerful analytics, intelligent insights, 
              and seamless expense splitting for groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/app?mode=signup')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-800 transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 text-white font-semibold px-8 py-3"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/app?mode=signin')}
                className="border-2 border-purple-400 text-purple-300 hover:bg-purple-500 hover:text-white hover:border-purple-500 active:bg-purple-600 active:border-purple-600 transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 font-semibold px-8 py-3 backdrop-blur-sm"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need to manage expenses
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Powerful features designed to make expense tracking simple, 
              secure, and insightful.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-purple-400/30 active:bg-white/15 active:border-purple-400/50 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer group">
                <CardHeader>
                  <div className="text-purple-400 mb-4 transition-all duration-300 group-hover:text-emerald-400 group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white group-hover:text-emerald-300 transition-colors duration-300">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why choose our expense tracker?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Built with modern technology and user experience in mind, 
                our platform provides everything you need for effective financial management.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Monthly Expenses</span>
                    <span className="text-green-400 font-bold">$2,450</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Food & Dining</span>
                      <div className="text-white font-medium">$650</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Transportation</span>
                      <div className="text-white font-medium">$320</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Entertainment</span>
                      <div className="text-white font-medium">$280</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Utilities</span>
                      <div className="text-white font-medium">$180</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to take control of your finances?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of users who are already managing their expenses smarter.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/app?mode=signup')}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 active:from-orange-700 active:to-red-700 transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 text-white font-semibold text-lg px-10 py-4"
          >
            Start Tracking Today
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 