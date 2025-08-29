import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Polling App</h1>
          <p className="text-xl text-gray-600 mb-8">
            Create engaging polls and gather real-time feedback from your audience
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/polls/new">
              <Button size="lg">Create Your First Poll</Button>
            </Link>
            <Link href="/polls">
              <Button variant="outline" size="lg">View All Polls</Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Easy to Create</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Create polls in seconds with our intuitive interface. Just add your question and options!
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Real-time Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Watch votes come in live with beautiful charts and instant updates.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Share your polls via links or QR codes to reach your audience anywhere.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">1</span>
                <div>
                  <h3 className="font-semibold">Sign Up</h3>
                  <p className="text-gray-600">Create your account to start managing polls</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">2</span>
                <div>
                  <h3 className="font-semibold">Create a Poll</h3>
                  <p className="text-gray-600">Add your question and multiple choice options</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">3</span>
                <div>
                  <h3 className="font-semibold">Share & Collect</h3>
                  <p className="text-gray-600">Share your poll and watch the results come in</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/auth/register">
                <Button>Get Started Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}